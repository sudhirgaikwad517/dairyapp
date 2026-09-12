import { Request, Response } from 'express';
import { customerAuthService } from '../services/CustomerAuthService';
import { activityLogService } from '../services/ActivityLogService';
import { cutoffService, formatDateOnly } from '../services/CutoffService';
import prisma from '../db/prisma';
import crypto from 'crypto';

export class SubscriptionController {
  public async index(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const subscriptions = await prisma.subscriptions.findMany({
        where: { customer_id: customer.id },
        include: {
          products: { include: { product_categories: true } },
          product_variants: true,
          delivery_slots: true
        },
        orderBy: { created_at: 'desc' }
      });

      const formatted = subscriptions.map((sub: any) => ({
        id: sub.id,
        productId: sub.product_id,
        variantId: sub.variant_id,
        productName: sub.products.name,
        size: sub.product_variants?.size_label || sub.products.size,
        imageUrl: sub.products.image_url,
        status: sub.status,
        frequency: sub.frequency,
        quantity: sub.quantity,
        nextDeliveryDate: sub.next_delivery_date,
        pausedFrom: sub.paused_from,
        pausedUntil: sub.paused_until,
        walletAutoDebit: sub.wallet_auto_debit,
        deliverySlot: sub.delivery_slots ? {
          id: sub.delivery_slots.id,
          label: sub.delivery_slots.label,
          startTime: sub.delivery_slots.start_time,
          endTime: sub.delivery_slots.end_time
        } : null,
        createdAt: sub.created_at
      }));

      return res.status(200).json({ success: true, data: { subscriptions: formatted } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async store(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const { productId, variantId, frequency, quantity, deliverySlotId, walletAutoDebit } = req.body;
      if (!productId) return res.status(422).json({ success: false, message: 'Product ID required' });

      const sub = await prisma.subscriptions.create({
        data: {
          id: crypto.randomUUID(),
          customer_id: customer.id,
          product_id: productId,
          variant_id: variantId || null,
          frequency: frequency || 'daily',
          quantity: quantity || 1,
          delivery_slot_id: deliverySlotId || null,
          wallet_auto_debit: !!walletAutoDebit,
          status: 'active',
          next_delivery_date: new Date(Date.now() + 86400000),
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      const product = await prisma.products.findUnique({ where: { id: productId } });
      await activityLogService.log({
        type: 'subscription',
        subtype: 'create',
        title: 'Subscribe Request',
        message: `${customer.name || customer.phone}, order for ${product?.name || 'product'} : ${quantity || 1} starting ${sub.next_delivery_date ? formatDateOnly(sub.next_delivery_date) : ''} on ${frequency || 'daily'} basis is placed successfully.`,
        customerId: customer.id
      });

      return res.status(201).json({ success: true, data: { subscription: sub } });
    } catch (error) {
      console.error(error);
      return res.status(422).json({ success: false, errorCode: 'SUBSCRIPTION_ERROR', message: 'Unable to create subscription' });
    }
  }

  public async pause(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const { pausedFrom, pausedUntil } = req.body;

      // A holiday requested before the cutoff starts the very next day; requested
      // at/after the cutoff, tomorrow's delivery is already locked in, so the
      // earliest it can start is pushed one day further.
      const { earliestEffectiveDate } = await cutoffService.getEarliestEffectiveDate();
      const requestedFrom = pausedFrom ? new Date(pausedFrom) : earliestEffectiveDate;
      const effectiveFrom = requestedFrom < earliestEffectiveDate ? earliestEffectiveDate : requestedFrom;

      const sub = await prisma.subscriptions.update({
        where: { id: req.params.id as string, customer_id: customer.id },
        data: {
          status: 'paused',
          paused_from: effectiveFrom,
          paused_until: pausedUntil ? new Date(pausedUntil) : null,
          updated_at: new Date()
        }
      });

      await activityLogService.log({
        type: 'subscription',
        subtype: 'pause',
        title: 'Subscribe Pause Request',
        message: `${customer.name || customer.phone}, pause request received. Plan will be paused from ${formatDateOnly(effectiveFrom)}${sub.paused_until ? ` until ${formatDateOnly(sub.paused_until)}` : ''}.`,
        customerId: customer.id
      });

      return res.status(200).json({ success: true, data: { subscription: sub, effectiveFrom: formatDateOnly(effectiveFrom) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal error' });
    }
  }

  public async resume(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const sub = await prisma.subscriptions.update({
        where: { id: req.params.id as string, customer_id: customer.id },
        data: { status: 'active', paused_from: null, paused_until: null, updated_at: new Date() }
      });

      await activityLogService.log({
        type: 'subscription',
        subtype: 'resume',
        title: 'Subscribe Resumed Request',
        message: `${customer.name || customer.phone}, resume request received. Plan will be resumed immediately.`,
        customerId: customer.id
      });

      return res.status(200).json({ success: true, data: { subscription: sub } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal error' });
    }
  }

  public async cancel(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const { cancelReasonId, cancelNote } = req.body;

      const sub = await prisma.subscriptions.update({
        where: { id: req.params.id as string, customer_id: customer.id },
        data: {
          status: 'cancelled',
          next_delivery_date: null,
          paused_from: null,
          paused_until: null,
          cancel_reason_id: cancelReasonId || null,
          cancel_note: cancelNote || null,
          updated_at: new Date()
        }
      });

      let reasonText = '';
      if (cancelReasonId) {
        const reasonRow = await prisma.cancel_reasons.findUnique({ where: { id: cancelReasonId } });
        reasonText = reasonRow ? ` Reason: ${reasonRow.reason}.` : '';
      }

      await activityLogService.log({
        type: 'subscription',
        subtype: 'cancel',
        title: 'Subscription Cancelled',
        message: `${customer.name || customer.phone} cancelled their subscription.${reasonText}`,
        customerId: customer.id
      });

      return res.status(200).json({ success: true, data: { subscription: sub } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal error' });
    }
  }
}

export const subscriptionController = new SubscriptionController();
