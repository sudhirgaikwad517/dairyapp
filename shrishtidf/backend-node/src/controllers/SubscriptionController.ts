import { Request, Response } from 'express';
import { customerAuthService } from '../services/CustomerAuthService';
import { activityLogService } from '../services/ActivityLogService';
import { cutoffService, formatDateOnly } from '../services/CutoffService';
import { parseDayWiseDays, serializeDayWiseDays, SUBSCRIPTION_FREQUENCIES, addFrequencyDays, parseDateOnly } from '../services/SubscriptionLifecycleService';
import { computeSubscriptionQuote } from '../services/SubscriptionPricingService';
import { razorpayService } from '../services/RazorpayService';
import prisma from '../db/prisma';
import crypto from 'crypto';

const DAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

function frequencyLabel(frequency: string, dayWiseDays: number[]): string {
  switch (frequency) {
    case 'daily': return 'Every day';
    case 'alternate_days': return 'Alternate day';
    case 'every_3_days': return 'Every 3 days';
    case 'day_wise': return dayWiseDays.length ? `Day wise (${dayWiseDays.map((d) => DAY_LABELS[d]).join(', ')})` : 'Day wise';
    case 'weekly': return 'Weekly';
    default: return frequency;
  }
}

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

      const formatted = subscriptions.map((sub: any) => {
        const dayWiseDays = parseDayWiseDays(sub.day_wise_days);
        return {
          id: sub.id,
          productId: sub.product_id,
          variantId: sub.variant_id,
          productName: sub.products.name,
          size: sub.product_variants?.size_label || sub.products.size,
          imageUrl: sub.products.image_url,
          status: sub.status,
          frequency: sub.frequency,
          frequencyLabel: frequencyLabel(sub.frequency, dayWiseDays),
          dayWiseDays,
          quantity: sub.quantity,
          rate: sub.rate,
          startDate: sub.start_date,
          endDate: sub.expires_at,
          nextDeliveryDate: sub.next_delivery_date,
          pausedFrom: sub.paused_from,
          pausedUntil: sub.paused_until,
          walletAutoDebit: sub.wallet_auto_debit,
          hasPendingChange: !!sub.change_effective_date,
          pendingQuantity: sub.pending_quantity,
          changeEffectiveDate: sub.change_effective_date,
          deliverySlot: sub.delivery_slots ? {
            id: sub.delivery_slots.id,
            label: sub.delivery_slots.label,
            startTime: sub.delivery_slots.start_time,
            endTime: sub.delivery_slots.end_time
          } : null,
          createdAt: sub.created_at
        };
      });

      return res.status(200).json({ success: true, data: { subscriptions: formatted } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  /// Lets the app show "You'll pay ₹X for N deliveries" (prepaid) before the
  /// customer commits to anything — same math [store] uses to actually
  /// charge, so the preview can never drift from the real total.
  public async quote(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const result = await computeSubscriptionQuote(customer.id, req.body);
      if (!result.ok) {
        return res.status(result.failure.status).json({
          success: false,
          errorCode: result.failure.errorCode,
          message: result.failure.message,
          data: result.failure.data
        });
      }

      const wallet = await prisma.customer_wallets.findUnique({ where: { customer_id: customer.id } });
      const walletBalance = wallet ? Number(wallet.balance) : 0;

      return res.status(200).json({
        success: true,
        data: {
          isPrepaid: result.quote.isPrepaid,
          rate: result.quote.rate,
          quantity: result.quote.quantity,
          occurrences: result.quote.occurrences,
          totalCost: result.quote.totalCost,
          effectiveFrom: formatDateOnly(result.quote.effectiveStart),
          walletBalance,
          walletSufficient: walletBalance >= result.quote.totalCost
        }
      });
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

      const result = await computeSubscriptionQuote(customer.id, req.body);
      if (!result.ok) {
        return res.status(result.failure.status).json({
          success: false,
          errorCode: result.failure.errorCode,
          message: result.failure.message,
          data: result.failure.data
        });
      }
      const quote = result.quote;
      const { product, variant, isPrepaid, frequency, dayWiseDays, quantity, effectiveStart, expiresAt, occurrences, rate, totalCost } = quote;
      const { deliverySlotId, paymentMethod, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      // Postpaid is billed per delivery as it happens — nothing to pay now, so
      // auto-debit is switched on unconditionally rather than left to chance.
      // Prepaid already pays the full plan below, so no per-delivery billing.
      let walletAutoDebit = !isPrepaid;
      let paymentReferenceId: string | null = null;

      if (isPrepaid && totalCost > 0) {
        if (paymentMethod === 'wallet') {
          const wallet = await prisma.customer_wallets.findUnique({ where: { customer_id: customer.id } });
          const balance = wallet ? Number(wallet.balance) : 0;
          if (balance < totalCost) {
            return res.status(422).json({
              success: false,
              errorCode: 'INSUFFICIENT_WALLET_BALANCE',
              message: `Your wallet balance (₹${balance}) is less than the plan total (₹${totalCost}). Add money or pay online instead.`,
              data: { totalCost, walletBalance: balance }
            });
          }
        } else if (paymentMethod === 'online') {
          if (!razorpayService.isConfigured) {
            return res.status(503).json({ success: false, errorCode: 'RAZORPAY_NOT_CONFIGURED', message: 'Online payment is not available right now' });
          }
          if (!razorpayService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
            return res.status(422).json({ success: false, errorCode: 'PAYMENT_VERIFICATION_FAILED', message: 'Payment could not be verified' });
          }
          if (!(await razorpayService.isPaymentCaptured(razorpayPaymentId))) {
            return res.status(422).json({ success: false, errorCode: 'PAYMENT_NOT_CAPTURED', message: 'Payment has not been completed' });
          }
          const paidOrder = await razorpayService.fetchOrder(razorpayOrderId);
          if (!paidOrder) {
            return res.status(422).json({ success: false, errorCode: 'PAYMENT_NOT_FOUND', message: 'Payment could not be verified' });
          }
          const paidAmount = Math.round(paidOrder.amount) / 100;
          if (paidAmount !== totalCost) {
            return res.status(422).json({ success: false, errorCode: 'AMOUNT_MISMATCH', message: 'Paid amount does not match the plan total' });
          }
          // A payment already spent on another subscription can't pay for this one too.
          const alreadyUsed = await prisma.wallet_transactions.findFirst({ where: { reference_id: razorpayPaymentId } });
          if (alreadyUsed) {
            return res.status(422).json({ success: false, errorCode: 'PAYMENT_ALREADY_USED', message: 'This payment has already been used' });
          }
          paymentReferenceId = razorpayPaymentId;
        } else {
          return res.status(422).json({
            success: false,
            errorCode: 'PAYMENT_METHOD_REQUIRED',
            message: 'Choose "Pay from Wallet" or "Pay Online" to subscribe.'
          });
        }
      }

      const planValidDays = expiresAt
        ? Math.round((expiresAt.getTime() - effectiveStart.getTime()) / 86400000) + 1
        : null;

      const sub = await prisma.$transaction(async (tx) => {
        const created = await tx.subscriptions.create({
          data: {
            id: crypto.randomUUID(),
            customer_id: customer.id,
            product_id: product.id,
            variant_id: variant?.id || null,
            frequency,
            day_wise_days: frequency === 'day_wise' ? serializeDayWiseDays(dayWiseDays) : null,
            quantity,
            delivery_slot_id: deliverySlotId || null,
            wallet_auto_debit: walletAutoDebit,
            status: 'active',
            start_date: effectiveStart,
            next_delivery_date: effectiveStart,
            rate,
            plan_valid_days: planValidDays,
            expires_at: expiresAt,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        // Prepaid: charge the whole plan now — via wallet debit if that's how
        // they paid, or nothing further if it was already paid via Razorpay.
        if (isPrepaid && totalCost > 0 && paymentMethod === 'wallet') {
          const wallet = await tx.customer_wallets.findUnique({ where: { customer_id: customer.id } });
          const newBalance = Number(wallet?.balance || 0) - totalCost;
          await tx.customer_wallets.update({ where: { customer_id: customer.id }, data: { balance: newBalance, updated_at: new Date() } });
          await tx.wallet_transactions.create({
            data: {
              id: crypto.randomUUID(),
              customer_id: customer.id,
              type: 'debit',
              amount: totalCost,
              balance_after: newBalance,
              reference_type: 'subscription_prepaid',
              reference_id: created.id,
              notes: `Prepaid subscription: ${product.name} × ${quantity} for ${occurrences} deliveries`,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        } else if (isPrepaid && totalCost > 0 && paymentReferenceId) {
          // Keep a record of the Razorpay payment even though it never
          // touched the wallet balance, so `alreadyUsed` above can catch reuse
          // and the customer's history shows what they paid for.
          await tx.wallet_transactions.create({
            data: {
              id: crypto.randomUUID(),
              customer_id: customer.id,
              type: 'debit',
              amount: 0,
              balance_after: (await tx.customer_wallets.findUnique({ where: { customer_id: customer.id } }))?.balance || 0,
              reference_type: 'subscription_prepaid_online',
              reference_id: paymentReferenceId,
              notes: `Paid online for subscription: ${product.name} × ${quantity} for ${occurrences} deliveries (₹${totalCost})`,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }

        return created;
      });

      await activityLogService.log({
        type: 'subscription',
        subtype: 'create',
        title: 'Subscribe Request',
        message: `${customer.name || customer.phone}, order for ${product.name} : ${quantity} starting ${formatDateOnly(effectiveStart)} on ${frequencyLabel(frequency, dayWiseDays)} basis is placed successfully.${isPrepaid && totalCost > 0 ? ` Paid ₹${totalCost} upfront for ${occurrences} deliveries.` : ''}`,
        customerId: customer.id,
        subscriptionId: sub.id,
        effectiveDate: effectiveStart
      });

      return res.status(201).json({
        success: true,
        data: { subscription: sub, effectiveFrom: formatDateOnly(effectiveStart), totalCost, occurrences }
      });
    } catch (error) {
      console.error(error);
      return res.status(422).json({ success: false, errorCode: 'SUBSCRIPTION_ERROR', message: 'Unable to create subscription' });
    }
  }

  // Lets a customer change the quantity, packaging (variant) or frequency of an existing
  // plan themselves — mirrors the admin Change Request flow, using the same cutoff-aware
  // pending-change mechanism so today's already-locked-in delivery is never altered.
  public async requestChange(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const subscriptionId = req.params.id as string;
      const existing = await prisma.subscriptions.findUnique({ where: { id: subscriptionId } });
      if (!existing || existing.customer_id !== customer.id) {
        return res.status(404).json({ success: false, message: 'Subscription not found' });
      }
      if (existing.status === 'cancelled') {
        return res.status(422).json({ success: false, message: 'A cancelled subscription cannot be changed' });
      }

      const { quantity, variantId, frequency, dayWiseDays } = req.body;
      if (variantId) {
        const variant = await prisma.product_variants.findUnique({ where: { id: variantId } });
        if (!variant || variant.product_id !== existing.product_id) {
          return res.status(422).json({ success: false, message: 'Selected packaging does not belong to this product' });
        }
      }
      if (frequency !== undefined && !SUBSCRIPTION_FREQUENCIES.includes(frequency)) {
        return res.status(422).json({ success: false, message: 'Please choose a valid delivery schedule' });
      }
      if (frequency === 'day_wise') {
        const days = parseDayWiseDays(Array.isArray(dayWiseDays) ? dayWiseDays.join(',') : String(dayWiseDays || ''));
        if (days.length === 0) {
          return res.status(422).json({ success: false, message: 'Choose at least one day for a Day wise plan' });
        }
      }

      const { earliestEffectiveDate } = await cutoffService.getEarliestEffectiveDate();
      const data: any = { updated_at: new Date() };
      if (quantity !== undefined) data.pending_quantity = Number(quantity);
      if (variantId !== undefined) data.pending_variant_id = variantId || null;
      if (frequency !== undefined) {
        data.pending_frequency = frequency;
        data.pending_day_wise_days = frequency === 'day_wise'
          ? serializeDayWiseDays(parseDayWiseDays(Array.isArray(dayWiseDays) ? dayWiseDays.join(',') : String(dayWiseDays || '')))
          : null;
      }

      const hasPendingChange = quantity !== undefined || variantId !== undefined || frequency !== undefined;
      if (!hasPendingChange) {
        return res.status(422).json({ success: false, message: 'Nothing to change' });
      }
      data.change_effective_date = earliestEffectiveDate;

      const sub = await prisma.subscriptions.update({ where: { id: subscriptionId }, data });

      await activityLogService.log({
        type: 'change_request',
        subtype: 'change_request',
        title: 'Change Request',
        message: `${customer.name || customer.phone} requested a change to their subscription, effective ${formatDateOnly(earliestEffectiveDate)}.`,
        customerId: customer.id,
        subscriptionId,
        effectiveDate: earliestEffectiveDate
      });

      return res.status(200).json({ success: true, data: { subscription: sub, effectiveFrom: formatDateOnly(earliestEffectiveDate) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal error' });
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
        customerId: customer.id,
        subscriptionId: sub.id,
        effectiveDate: effectiveFrom
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
        customerId: customer.id,
        subscriptionId: sub.id,
        effectiveDate: new Date()
      });

      return res.status(200).json({ success: true, data: { subscription: sub } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal error' });
    }
  }

  // "Upcoming Order" tab — projects each active subscription's next deliveries
  // forward from its `next_delivery_date`, the same field the admin daily
  // delivery workflow keeps up to date, so this never drifts from reality.
  public async upcoming(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const days = Math.min(30, Math.max(1, Number(req.query.days) || 14));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(today);
      rangeEnd.setDate(rangeEnd.getDate() + days - 1);

      const subscriptions = await prisma.subscriptions.findMany({
        where: { customer_id: customer.id, status: 'active' },
        include: { products: true, product_variants: true }
      });

      const byDate: Record<string, any[]> = {};
      for (const sub of subscriptions) {
        const dayWiseDays = parseDayWiseDays(sub.day_wise_days);
        let cursor: Date | null = sub.next_delivery_date ? new Date(sub.next_delivery_date) : (sub.start_date ? new Date(sub.start_date) : null);
        if (!cursor) continue;

        let guard = 0;
        while (cursor.getTime() < today.getTime() && guard < 2000) {
          cursor = addFrequencyDays(cursor, sub.frequency, dayWiseDays);
          guard++;
        }

        guard = 0;
        while (cursor.getTime() <= rangeEnd.getTime() && guard < 2000) {
          if (sub.expires_at && cursor.getTime() > new Date(sub.expires_at).getTime()) break;

          const key = formatDateOnly(cursor);
          if (!byDate[key]) byDate[key] = [];
          byDate[key].push({
            subscriptionId: sub.id,
            productId: sub.product_id,
            productName: sub.products.name,
            imageUrl: sub.products.image_url,
            size: sub.product_variants?.size_label || sub.products.size,
            quantity: sub.quantity
          });
          cursor = addFrequencyDays(cursor, sub.frequency, dayWiseDays);
          guard++;
        }
      }

      const days_ = Object.keys(byDate).sort().map((date) => ({ date, items: byDate[date] }));
      return res.status(200).json({ success: true, data: { days: days_ } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // "Order History" tab — actual marked deliveries, most recent first.
  public async history(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const { from, to } = req.query as Record<string, string>;
      const toDate = to ? parseDateOnly(to) : new Date();
      const fromDate = from ? parseDateOnly(from) : new Date(toDate.getTime() - 29 * 86400000);

      const records = await prisma.delivery_records.findMany({
        where: { customer_id: customer.id, delivery_date: { gte: fromDate, lte: toDate } },
        include: { products: true, product_variants: true },
        orderBy: { delivery_date: 'desc' }
      });

      return res.status(200).json({
        success: true,
        data: records.map((r: any) => ({
          id: r.id,
          date: r.delivery_date,
          productName: r.products.name,
          imageUrl: r.products.image_url,
          size: r.product_variants?.size_label || r.products.size,
          quantityOrdered: Number(r.quantity_ordered),
          quantityDelivered: Number(r.quantity_delivered),
          status: r.status
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
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
        customerId: customer.id,
        subscriptionId: sub.id
      });

      return res.status(200).json({ success: true, data: { subscription: sub } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal error' });
    }
  }
}

export const subscriptionController = new SubscriptionController();
