import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';
import { formatDateOnly } from '../../services/CutoffService';

function addFrequencyDays(date: Date, frequency: string): Date {
  const days = frequency === 'weekly' ? 7 : frequency === 'alternate_days' || frequency === 'alternate' ? 2 : 1;
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function mapRow(row: any) {
  return {
    recordId: row.recordId || null,
    subscriptionId: row.subscription_id,
    customerId: row.customer_id,
    customerName: row.customerName,
    address: row.address,
    hub: row.hub,
    city: row.city,
    deliveryBoyId: row.delivery_boy_id,
    deliveryBoy: row.deliveryBoy,
    deliveryMode: row.deliveryMode,
    productId: row.product_id,
    productName: row.productName,
    variantId: row.variant_id,
    quantityOrdered: Number(row.quantityOrdered),
    quantityDelivered: row.quantityDelivered !== null && row.quantityDelivered !== undefined ? Number(row.quantityDelivered) : Number(row.quantityOrdered),
    pendingQty: row.pendingQty !== null && row.pendingQty !== undefined ? Number(row.pendingQty) : 0,
    remark: row.remark || '',
    bottlesCollected: row.bottlesCollected || 0,
    status: row.status || 'pending',
    deliveredAt: row.deliveredAt || null
  };
}

export class AdminDailyDeliveryController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const dateStr = query.date || formatDateOnly(new Date());
      const targetDate = parseDateOnly(dateStr);
      const onlyUnmarked = query.unmarked === 'true';

      const customerWhere: any = {};
      if (query.deliveryBoyId) customerWhere.delivery_boy_id = query.deliveryBoyId;
      if (query.hubId) customerWhere.hub_id = query.hubId;
      if (query.city) customerWhere.city = { contains: query.city, mode: 'insensitive' };

      const [existingRecords, dueSubscriptions] = await Promise.all([
        prisma.delivery_records.findMany({
          where: { delivery_date: targetDate, customers: customerWhere },
          include: { customers: { include: { hubs: true, delivery_boys: true } }, products: true, product_variants: true }
        }),
        onlyUnmarked
          ? Promise.resolve([])
          : prisma.subscriptions.findMany({
              where: { status: 'active', next_delivery_date: targetDate, customers: customerWhere },
              include: { customers: { include: { hubs: true, delivery_boys: true } }, products: true, product_variants: true }
            })
      ]);

      const rows: any[] = [];

      for (const r of existingRecords) {
        const c = r.customers;
        rows.push({
          recordId: r.id,
          subscription_id: r.subscription_id,
          customer_id: r.customer_id,
          customerName: c?.name,
          address: c?.address,
          hub: c?.hubs?.name || null,
          city: c?.city,
          delivery_boy_id: r.delivery_boy_id,
          deliveryBoy: c?.delivery_boys?.name || null,
          deliveryMode: c?.delivery_mode,
          product_id: r.product_id,
          productName: `${r.products?.name || ''}${r.product_variants ? ` - ${r.product_variants.size_label}` : ''}`,
          variant_id: r.variant_id,
          quantityOrdered: r.quantity_ordered,
          quantityDelivered: r.quantity_delivered,
          pendingQty: r.pending_qty,
          remark: r.remark,
          bottlesCollected: r.bottles_collected,
          status: r.status,
          deliveredAt: r.delivered_at
        });
      }

      const alreadyMarkedSubIds = new Set(existingRecords.map((r: any) => r.subscription_id));
      for (const s of dueSubscriptions) {
        if (alreadyMarkedSubIds.has(s.id)) continue;
        const c: any = s.customers;
        rows.push({
          recordId: null,
          subscription_id: s.id,
          customer_id: s.customer_id,
          customerName: c?.name,
          address: c?.address,
          hub: c?.hubs?.name || null,
          city: c?.city,
          delivery_boy_id: c?.delivery_boy_id || null,
          deliveryBoy: c?.delivery_boys?.name || null,
          deliveryMode: c?.delivery_mode,
          product_id: s.product_id,
          productName: `${s.products?.name || ''}${s.product_variants ? ` - ${s.product_variants.size_label}` : ''}`,
          variant_id: s.variant_id,
          quantityOrdered: s.quantity,
          quantityDelivered: null,
          pendingQty: 0,
          remark: '',
          bottlesCollected: 0,
          status: 'pending',
          deliveredAt: null
        });
      }

      return res.status(200).json({ success: true, data: rows.map(mapRow), date: dateStr });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async save(req: Request, res: Response) {
    try {
      const { date, deliveries } = req.body as { date: string; deliveries: any[] };
      if (!date || !Array.isArray(deliveries) || deliveries.length === 0) {
        return res.status(422).json({ success: false, message: 'Date and at least one delivery entry are required' });
      }
      const targetDate = parseDateOnly(date);
      const now = new Date();

      const saved = [];
      for (const d of deliveries) {
        const subscription = await prisma.subscriptions.findUnique({ where: { id: d.subscriptionId } });
        if (!subscription) continue;

        const quantityOrdered = Number(d.quantityOrdered ?? subscription.quantity);
        const quantityDelivered = Number(d.quantityDelivered ?? quantityOrdered);
        const pendingQty = quantityOrdered - quantityDelivered;
        const status = quantityDelivered > 0 ? 'delivered' : 'not_delivered';

        const record = await prisma.delivery_records.upsert({
          where: { subscription_id_delivery_date: { subscription_id: d.subscriptionId, delivery_date: targetDate } },
          create: {
            id: crypto.randomUUID(),
            subscription_id: d.subscriptionId,
            customer_id: d.customerId || subscription.customer_id,
            delivery_boy_id: d.deliveryBoyId || null,
            delivery_date: targetDate,
            product_id: d.productId || subscription.product_id,
            variant_id: d.variantId || subscription.variant_id,
            quantity_ordered: quantityOrdered,
            quantity_delivered: quantityDelivered,
            pending_qty: pendingQty,
            remark: d.remark || null,
            bottles_collected: Number(d.bottlesCollected || 0),
            status,
            delivered_at: now,
            created_at: now,
            updated_at: now
          },
          update: {
            quantity_ordered: quantityOrdered,
            quantity_delivered: quantityDelivered,
            pending_qty: pendingQty,
            remark: d.remark || null,
            bottles_collected: Number(d.bottlesCollected || 0),
            status,
            delivered_at: now,
            updated_at: now
          }
        });

        // Advance the subscription only the first time this due date is marked — re-saving an
        // already-marked day must not push next_delivery_date forward a second time.
        if (subscription.next_delivery_date && formatDateOnly(new Date(subscription.next_delivery_date)) === date) {
          await prisma.subscriptions.update({
            where: { id: subscription.id },
            data: { next_delivery_date: addFrequencyDays(targetDate, subscription.frequency) }
          });
        }

        saved.push(record.id);
      }

      return res.status(200).json({ success: true, data: { saved: saved.length } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async unmark(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const record = await prisma.delivery_records.findUnique({ where: { id }, include: { subscriptions: true } });
      if (!record) return res.status(404).json({ success: false, message: 'Delivery record not found' });

      const recordDateStr = formatDateOnly(new Date(record.delivery_date));
      const sub = record.subscriptions;

      await prisma.delivery_records.delete({ where: { id } });

      // Only roll the subscription's next delivery date back if it had actually advanced past this record's date.
      if (sub.next_delivery_date && formatDateOnly(new Date(sub.next_delivery_date)) !== recordDateStr) {
        await prisma.subscriptions.update({ where: { id: sub.id }, data: { next_delivery_date: record.delivery_date } });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminDailyDeliveryController = new AdminDailyDeliveryController();
