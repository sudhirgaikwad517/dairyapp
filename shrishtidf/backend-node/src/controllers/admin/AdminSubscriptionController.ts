import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';
import { cutoffService, formatDateOnly } from '../../services/CutoffService';
import { parseDateOnly, parseDayWiseDays, serializeDayWiseDays, SUBSCRIPTION_FREQUENCIES } from '../../services/SubscriptionLifecycleService';
import { activityLogService } from '../../services/ActivityLogService';

function mapSubscriptionRow(s: any) {
  const today = formatDateOnly(new Date());
  const isExpired = s.status === 'active' && s.expires_at && formatDateOnly(new Date(s.expires_at)) < today;
  return {
    id: s.id,
    customerId: s.customer_id,
    customerCode: s.customers?.code,
    customerName: s.customers?.name,
    mobile: s.customers?.phone,
    customerType: s.customers?.customer_type,
    hub: s.customers?.hubs?.name || null,
    city: s.customers?.city,
    area: s.customers?.area,
    deliveryBoy: s.customers?.delivery_boys?.name || null,
    subscriptionDate: s.created_at,
    subscriptionType: 'Subscribe',
    startDate: s.start_date,
    productId: s.product_id,
    productName: s.products?.name,
    packaging: s.product_variants?.size_label || s.products?.size,
    qty: s.quantity,
    rate: s.rate,
    frequency: s.frequency,
    dayWiseDays: parseDayWiseDays(s.day_wise_days),
    deliveryType: s.delivery_modes?.name || null,
    customDetails: s.custom_details,
    nextDeliveryDate: s.next_delivery_date,
    pausedFrom: s.paused_from,
    pausedUntil: s.paused_until,
    cancelledAt: s.cancelled_at,
    inactivatedAt: s.inactivated_at,
    expiresAt: s.expires_at,
    hasPendingChange: !!s.change_effective_date,
    changeEffectiveDate: s.change_effective_date,
    status: isExpired ? 'expired' : s.status,
    createdAt: s.created_at
  };
}

const SUBSCRIPTION_INCLUDE = {
  customers: { include: { hubs: true, delivery_routes: true, delivery_boys: true } },
  products: true,
  product_variants: true,
  delivery_modes: true,
  cancel_reasons: true
};

function buildSubscriptionWhere(query: Record<string, any>) {
  const {
    customerId, customerType, hubId, deliveryBoyId, productId, deliveryModeId, city, area,
    subDateFrom, subDateTo, startDateFrom, startDateTo, cancelDateFrom, cancelDateTo, inactiveDateFrom, inactiveDateTo
  } = query;

  const where: any = {};
  if (customerId) where.customer_id = customerId;
  if (productId) where.product_id = productId;
  if (deliveryModeId) where.delivery_mode_id = deliveryModeId;

  const customerFilter: any = {};
  if (customerType) customerFilter.customer_type = customerType;
  if (hubId) customerFilter.hub_id = hubId;
  if (deliveryBoyId) customerFilter.delivery_boy_id = deliveryBoyId;
  if (city) customerFilter.city = { contains: city, mode: 'insensitive' };
  if (area) customerFilter.area = { contains: area, mode: 'insensitive' };
  if (Object.keys(customerFilter).length) where.customers = customerFilter;

  if (subDateFrom || subDateTo) {
    where.created_at = {};
    if (subDateFrom) where.created_at.gte = new Date(subDateFrom);
    if (subDateTo) where.created_at.lte = new Date(`${subDateTo}T23:59:59.999Z`);
  }
  if (startDateFrom || startDateTo) {
    where.start_date = {};
    if (startDateFrom) where.start_date.gte = parseDateOnly(startDateFrom);
    if (startDateTo) where.start_date.lte = parseDateOnly(startDateTo);
  }
  if (cancelDateFrom || cancelDateTo) {
    where.cancelled_at = {};
    if (cancelDateFrom) where.cancelled_at.gte = parseDateOnly(cancelDateFrom);
    if (cancelDateTo) where.cancelled_at.lte = parseDateOnly(cancelDateTo);
  }
  if (inactiveDateFrom || inactiveDateTo) {
    where.inactivated_at = {};
    if (inactiveDateFrom) where.inactivated_at.gte = parseDateOnly(inactiveDateFrom);
    if (inactiveDateTo) where.inactivated_at.lte = parseDateOnly(inactiveDateTo);
  }
  return where;
}

// The 5 tabs the reference UI shows are a mix of the stored `status` plus a derived
// "expired" bucket (an active prepaid plan whose validity window has passed) — kept
// derived rather than stored so it can never go stale relative to `expires_at`.
function applyStatusBucket(where: any, status: string | undefined, today: string) {
  if (!status || status === 'active') {
    where.status = 'active';
    where.OR = [{ expires_at: null }, { expires_at: { gte: parseDateOnly(today) } }];
  } else if (status === 'expired') {
    where.status = 'active';
    where.expires_at = { lt: parseDateOnly(today) };
  } else if (status === 'hold') {
    where.status = 'paused';
  } else {
    where.status = status; // 'inactive' | 'cancelled'
  }
}

export class AdminSubscriptionController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildSubscriptionWhere(query);
      applyStatusBucket(where, query.status, formatDateOnly(new Date()));

      const [total, rows] = await Promise.all([
        prisma.subscriptions.count({ where }),
        prisma.subscriptions.findMany({
          where,
          include: SUBSCRIPTION_INCLUDE,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map(mapSubscriptionRow), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportSubscriptions(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where = buildSubscriptionWhere(query);
      applyStatusBucket(where, query.status, formatDateOnly(new Date()));

      const rows = await prisma.subscriptions.findMany({ where, include: SUBSCRIPTION_INCLUDE, orderBy: { created_at: 'desc' } });
      const mapped = rows.map(mapSubscriptionRow);

      const header = ['Customer', 'Mobile', 'Hub', 'Delivery Boy', 'Subscription Date', 'Start Date', 'Product', 'Packaging', 'Qty', 'Rate', 'Delivery Type', 'Status'];
      const csvRows = mapped.map((s: any) => [
        s.customerName || '', s.mobile || '', s.hub || '', s.deliveryBoy || '',
        s.subscriptionDate ? formatDateOnly(new Date(s.subscriptionDate)) : '',
        s.startDate ? formatDateOnly(new Date(s.startDate)) : '',
        s.productName || '', s.packaging || '', s.qty, s.rate ?? '', s.deliveryType || '', s.status
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="subscriptions-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const sub = await prisma.subscriptions.findUnique({ where: { id: req.params.id as string }, include: SUBSCRIPTION_INCLUDE });
      if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
      return res.status(200).json({ success: true, data: mapSubscriptionRow(sub) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async getCustomerPlans(req: Request, res: Response) {
    try {
      const subs = await prisma.subscriptions.findMany({
        where: { customer_id: req.params.customerId as string, status: { in: ['active', 'paused'] } },
        include: { products: true, product_variants: true },
        orderBy: { created_at: 'desc' }
      });
      return res.status(200).json({
        success: true,
        data: subs.map((s: any) => ({
          id: s.id,
          label: `${s.products?.name}${s.product_variants ? ` - ${s.product_variants.size_label}` : ''} (Qty ${s.quantity}, ${s.frequency})`,
          status: s.status
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  // Categories -> products -> variants a customer is eligible to buy in "subscribe" or
  // "onetime" mode, given their customer_type (prepaid/postpaid) and city.
  public async catalogForCustomer(req: Request, res: Response) {
    try {
      const customerId = req.params.customerId as string;
      const mode = (req.query.mode as string) === 'onetime' ? 'onetime' : 'subscribe';
      const customer = await prisma.customers.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

      const isPrepaid = customer.customer_type === 'prepaid';
      const productWhere: any = { is_active: true };
      if (mode === 'subscribe') {
        productWhere.allow_subscription = true;
        productWhere[isPrepaid ? 'prepaid_subscribe' : 'postpaid_subscribe'] = true;
      } else {
        productWhere[isPrepaid ? 'prepaid_getonce' : 'postpaid_getonce'] = true;
      }

      const categories = await prisma.product_categories.findMany({
        where: { is_active: true },
        orderBy: { sort_order: 'asc' },
        include: {
          products: {
            where: productWhere,
            orderBy: { sort_order: 'asc' },
            include: { product_variants: { where: { out_of_stock: false }, orderBy: { sort_order: 'asc' } } }
          }
        }
      });

      const rateField = mode === 'subscribe' ? 'subscription' : 'buy_once';
      const mapped = categories
        .map((c: any) => ({
          id: c.id,
          label: c.label,
          products: c.products
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              gstRate: Number(p.gst_rate || 0),
              isTaxInclusive: p.is_tax_inclusive,
              variants: p.product_variants
                .filter((v: any) => !v.city || v.city.toLowerCase() === (customer.city || '').toLowerCase())
                .map((v: any) => ({
                  id: v.id,
                  sizeLabel: v.size_label,
                  rate: Number(v[rateField]),
                  ltrs: v.ltrs ? Number(v.ltrs) : null,
                  isDefault: v.is_default
                }))
            }))
            .filter((p: any) => p.variants.length > 0)
        }))
        .filter((c: any) => c.products.length > 0);

      const deliveryModes = await prisma.delivery_modes.findMany({ where: { is_active: true }, orderBy: { sort_order: 'asc' } });

      return res.status(200).json({
        success: true,
        data: {
          customer: { id: customer.id, code: customer.code, name: customer.name, customerType: customer.customer_type, city: customer.city },
          categories: mapped,
          deliveryModes: deliveryModes.map((d: any) => ({ id: d.id, name: d.name }))
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async subscribe(req: Request, res: Response) {
    try {
      const { customerId, items } = req.body as { customerId: string; items: any[] };
      if (!customerId || !Array.isArray(items) || items.length === 0) {
        return res.status(422).json({ success: false, message: 'Customer and at least one product are required' });
      }

      const customer = await prisma.customers.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

      const { earliestEffectiveDate } = await cutoffService.getEarliestEffectiveDate();
      const isPrepaid = customer.customer_type === 'prepaid';
      const now = new Date();
      const created = [];

      for (const item of items) {
        const variant = item.variantId ? await prisma.product_variants.findUnique({ where: { id: item.variantId } }) : null;
        const product = await prisma.products.findUnique({ where: { id: item.productId } });
        if (!product) return res.status(422).json({ success: false, message: 'One of the selected products does not exist' });
        if (!product.allow_subscription || !(isPrepaid ? product.prepaid_subscribe : product.postpaid_subscribe)) {
          return res.status(422).json({ success: false, message: `${product.name} is not available for subscription for this customer type` });
        }

        const frequency = item.frequency || 'daily';
        if (!SUBSCRIPTION_FREQUENCIES.includes(frequency)) {
          return res.status(422).json({ success: false, message: `${product.name}: choose a valid delivery schedule` });
        }
        const dayWiseArray = frequency === 'day_wise'
          ? parseDayWiseDays(Array.isArray(item.dayWiseDays) ? item.dayWiseDays.join(',') : String(item.dayWiseDays || ''))
          : [];
        if (frequency === 'day_wise' && dayWiseArray.length === 0) {
          return res.status(422).json({ success: false, message: `${product.name}: choose at least one day for a Day wise plan` });
        }

        const requestedStart = item.startDate ? parseDateOnly(item.startDate) : earliestEffectiveDate;
        const effectiveStart = requestedStart < earliestEffectiveDate ? earliestEffectiveDate : requestedStart;
        const rate = Number(variant ? variant.subscription : product.subscription);
        const planValidDays = item.planValidDays ? Number(item.planValidDays) : null;
        const expiresAt = isPrepaid && planValidDays
          ? new Date(Date.UTC(effectiveStart.getUTCFullYear(), effectiveStart.getUTCMonth(), effectiveStart.getUTCDate() + planValidDays - 1))
          : null;

        const sub = await prisma.subscriptions.create({
          data: {
            id: crypto.randomUUID(),
            customer_id: customerId,
            product_id: item.productId,
            variant_id: item.variantId || null,
            frequency,
            day_wise_days: frequency === 'day_wise' ? serializeDayWiseDays(dayWiseArray) : null,
            quantity: Number(item.quantity) || 1,
            delivery_slot_id: item.deliverySlotId || null,
            delivery_mode_id: item.deliveryModeId || null,
            status: 'active',
            start_date: effectiveStart,
            next_delivery_date: effectiveStart,
            rate,
            custom_details: item.customDetails || null,
            plan_valid_days: planValidDays,
            expires_at: expiresAt,
            created_at: now,
            updated_at: now
          }
        });
        created.push(sub.id);
      }

      return res.status(201).json({ success: true, data: { created: created.length, effectiveFrom: formatDateOnly(earliestEffectiveDate) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async oneTimeOrder(req: Request, res: Response) {
    try {
      const { customerId, deliveryDate, items } = req.body as { customerId: string; deliveryDate: string; items: any[] };
      if (!customerId || !Array.isArray(items) || items.length === 0) {
        return res.status(422).json({ success: false, message: 'Customer and at least one product are required' });
      }

      const customer = await prisma.customers.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

      const isPrepaid = customer.customer_type === 'prepaid';
      const now = new Date();
      const targetDate = deliveryDate ? parseDateOnly(deliveryDate) : new Date(Date.now() + 86400000);

      let subtotal = 0;
      let taxAmount = 0;
      const lineData: any[] = [];

      for (const item of items) {
        const product = await prisma.products.findUnique({ where: { id: item.productId } });
        if (!product) return res.status(422).json({ success: false, message: 'One of the selected products does not exist' });
        if (!(isPrepaid ? product.prepaid_getonce : product.postpaid_getonce)) {
          return res.status(422).json({ success: false, message: `${product.name} is not available as a one-time order for this customer type` });
        }
        const variant = item.variantId ? await prisma.product_variants.findUnique({ where: { id: item.variantId } }) : null;
        const rate = Number(variant ? variant.buy_once : product.buy_once);
        const qty = Number(item.quantity) || 1;
        const lineTotal = rate * qty;
        const gstRate = Number(product.gst_rate || 0);
        const lineTax = product.is_tax_inclusive ? 0 : Math.round(lineTotal * (gstRate / 100));
        subtotal += lineTotal;
        taxAmount += lineTax;

        lineData.push({
          id: crypto.randomUUID(),
          product_id: item.productId,
          product_name: product.name,
          size: variant?.size_label || product.size,
          quantity: qty,
          unit_price: rate,
          purchase_type: 'BUY_ONCE',
          line_total: lineTotal,
          variant_id: item.variantId || null,
          gst_rate: gstRate,
          tax_amount: lineTax,
          created_at: now,
          updated_at: now
        });
      }

      const orderId = crypto.randomUUID();
      const invoiceNumber = `SDF-${formatDateOnly(now).replace(/-/g, '')}-${orderId.substring(0, 8).toUpperCase()}`;

      const order = await prisma.orders.create({
        data: {
          id: orderId,
          customer_id: customerId,
          customer_name: customer.name,
          phone: customer.phone,
          address: customer.address,
          pincode: customer.pincode,
          delivery_date: targetDate,
          route_id: customer.route_id,
          status: 'PENDING',
          subtotal,
          tax_amount: taxAmount,
          total_amount: subtotal + taxAmount,
          payment_method: 'cod',
          payment_status: 'pending',
          invoice_number: invoiceNumber,
          created_at: now,
          updated_at: now,
          order_items: { create: lineData }
        }
      });

      return res.status(201).json({ success: true, data: { orderId: order.id, invoiceNumber, total: subtotal + taxAmount } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async requestChange(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.subscriptions.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Subscription not found' });
      if (existing.status === 'cancelled') return res.status(422).json({ success: false, message: 'A cancelled subscription cannot be changed' });

      const { quantity, variantId, frequency, deliveryModeId, deliverySlotId, customDetails } = req.body;
      if (variantId) {
        const variant = await prisma.product_variants.findUnique({ where: { id: variantId } });
        if (!variant || variant.product_id !== existing.product_id) {
          return res.status(422).json({ success: false, message: 'Selected packaging does not belong to this product' });
        }
      }

      const { earliestEffectiveDate } = await cutoffService.getEarliestEffectiveDate();

      const data: any = { updated_at: new Date() };
      if (customDetails !== undefined) data.custom_details = customDetails || null;
      if (quantity !== undefined) data.pending_quantity = Number(quantity);
      if (variantId !== undefined) data.pending_variant_id = variantId || null;
      if (frequency !== undefined) data.pending_frequency = frequency;
      if (deliverySlotId !== undefined) data.pending_delivery_slot_id = deliverySlotId || null;
      if (deliveryModeId !== undefined) data.pending_delivery_mode_id = deliveryModeId || null;

      const hasPendingChange = quantity !== undefined || variantId !== undefined || frequency !== undefined || deliverySlotId !== undefined || deliveryModeId !== undefined;
      if (hasPendingChange) data.change_effective_date = earliestEffectiveDate;

      const sub = await prisma.subscriptions.update({ where: { id }, data, include: SUBSCRIPTION_INCLUDE });

      if (hasPendingChange) {
        await activityLogService.log({
          type: 'change_request',
          subtype: 'change_request',
          title: 'Change Request (Admin)',
          message: `Admin requested a change to ${sub.products?.name || 'a subscription'}, effective ${formatDateOnly(earliestEffectiveDate)}.`,
          customerId: sub.customer_id,
          subscriptionId: sub.id,
          effectiveDate: earliestEffectiveDate,
          actor: 'admin'
        });
      }

      return res.status(200).json({ success: true, data: { subscription: mapSubscriptionRow(sub), effectiveFrom: formatDateOnly(earliestEffectiveDate) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async pause(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { pausedUntil } = req.body;
      const { earliestEffectiveDate } = await cutoffService.getEarliestEffectiveDate();

      const sub = await prisma.subscriptions.update({
        where: { id },
        data: {
          status: 'paused',
          paused_from: earliestEffectiveDate,
          paused_until: pausedUntil ? parseDateOnly(pausedUntil) : null,
          updated_at: new Date()
        },
        include: SUBSCRIPTION_INCLUDE
      });

      await activityLogService.log({
        type: 'subscription',
        subtype: 'pause',
        title: 'Subscription Paused (Admin)',
        message: `Admin paused ${sub.products?.name || 'a subscription'}, effective ${formatDateOnly(earliestEffectiveDate)}.`,
        customerId: sub.customer_id,
        subscriptionId: sub.id,
        effectiveDate: earliestEffectiveDate,
        actor: 'admin'
      });

      return res.status(200).json({ success: true, data: { subscription: mapSubscriptionRow(sub), effectiveFrom: formatDateOnly(earliestEffectiveDate) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async resume(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const sub = await prisma.subscriptions.update({
        where: { id },
        data: { status: 'active', paused_from: null, paused_until: null, inactivated_at: null, updated_at: new Date() },
        include: SUBSCRIPTION_INCLUDE
      });

      await activityLogService.log({
        type: 'subscription',
        subtype: 'resume',
        title: 'Subscription Resumed (Admin)',
        message: `Admin resumed ${sub.products?.name || 'a subscription'}.`,
        customerId: sub.customer_id,
        subscriptionId: sub.id,
        effectiveDate: new Date(),
        actor: 'admin'
      });

      return res.status(200).json({ success: true, data: { subscription: mapSubscriptionRow(sub) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async setInactive(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const sub = await prisma.subscriptions.update({
        where: { id },
        data: { status: 'inactive', inactivated_at: new Date(), updated_at: new Date() },
        include: SUBSCRIPTION_INCLUDE
      });
      return res.status(200).json({ success: true, data: { subscription: mapSubscriptionRow(sub) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async cancel(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { cancelReasonId, cancelNote } = req.body;
      const sub = await prisma.subscriptions.update({
        where: { id },
        data: {
          status: 'cancelled',
          next_delivery_date: null,
          paused_from: null,
          paused_until: null,
          cancel_reason_id: cancelReasonId || null,
          cancel_note: cancelNote || null,
          cancelled_at: new Date(),
          updated_at: new Date()
        },
        include: SUBSCRIPTION_INCLUDE
      });

      await activityLogService.log({
        type: 'subscription',
        subtype: 'cancel',
        title: 'Subscription Cancelled (Admin)',
        message: `Admin cancelled ${sub.products?.name || 'a subscription'}.${cancelNote ? ` Note: ${cancelNote}.` : ''}`,
        customerId: sub.customer_id,
        subscriptionId: sub.id,
        actor: 'admin'
      });

      return res.status(200).json({ success: true, data: { subscription: mapSubscriptionRow(sub) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminSubscriptionController = new AdminSubscriptionController();
