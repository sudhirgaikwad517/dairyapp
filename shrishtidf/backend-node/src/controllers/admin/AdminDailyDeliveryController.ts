import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';
import { formatDateOnly } from '../../services/CutoffService';
import { addFrequencyDays, parseDateOnly, parseDayWiseDays, subscriptionLifecycleService } from '../../services/SubscriptionLifecycleService';

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
              where: { status: 'active', next_delivery_date: { lte: targetDate }, customers: customerWhere },
              include: { customers: { include: { hubs: true, delivery_boys: true } }, products: true, product_variants: true }
            })
      ]);

      // Candidates include anything overdue (next_delivery_date <= target), because a
      // subscription can be "stuck" behind a vacation window or an unpromoted pending
      // change — resolve() below fast-forwards/promotes it and tells us whether it
      // actually lands on the target date.
      const resolvedSubscriptions: any[] = [];
      for (let s of dueSubscriptions) {
        const promoted = await subscriptionLifecycleService.promotePendingIfDue(s as any, dateStr);
        if (promoted) {
          s = await prisma.subscriptions.findUnique({
            where: { id: s.id },
            include: { customers: { include: { hubs: true, delivery_boys: true } }, products: true, product_variants: true }
          }) as any;
        }
        const finalDueDate = await subscriptionLifecycleService.skipVacationDays(s as any, dateStr);
        if (finalDueDate && formatDateOnly(finalDueDate) === dateStr) {
          resolvedSubscriptions.push({ ...s, next_delivery_date: finalDueDate });
        }
      }

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
      for (const s of resolvedSubscriptions) {
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
        const subscription = await prisma.subscriptions.findUnique({
          where: { id: d.subscriptionId },
          include: { customers: true }
        });
        if (!subscription) continue;

        const quantityOrdered = Number(d.quantityOrdered ?? subscription.quantity);
        const quantityDelivered = Number(d.quantityDelivered ?? quantityOrdered);
        const pendingQty = quantityOrdered - quantityDelivered;
        const status = quantityDelivered > 0 ? 'delivered' : 'not_delivered';

        // Postpaid customers pay per delivery, not upfront — need the
        // previously-billed quantity so re-saving a corrected delivery bills
        // only the difference instead of charging the same day twice.
        const existingRecord = await prisma.delivery_records.findUnique({
          where: { subscription_id_delivery_date: { subscription_id: d.subscriptionId, delivery_date: targetDate } }
        });
        const previouslyDelivered = existingRecord ? Number(existingRecord.quantity_delivered) : 0;

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
            data: { next_delivery_date: addFrequencyDays(targetDate, subscription.frequency, parseDayWiseDays(subscription.day_wise_days)) }
          });
        }

        // Postpaid billing: charge the wallet for exactly what was actually
        // delivered, the moment it's marked. A prepaid plan already paid for
        // every delivery upfront, so it never touches the wallet here.
        if (subscription.wallet_auto_debit && subscription.customers?.customer_type === 'postpaid') {
          const deltaQty = quantityDelivered - previouslyDelivered;
          const deltaAmount = deltaQty * Number(subscription.rate || 0);
          if (deltaAmount !== 0) {
            const wallet = await prisma.customer_wallets.upsert({
              where: { customer_id: subscription.customer_id },
              update: { updated_at: now },
              create: { id: crypto.randomUUID(), customer_id: subscription.customer_id, balance: 0, created_at: now, updated_at: now }
            });
            // Postpaid is allowed to go negative — that running due is the point.
            const newBalance = Number(wallet.balance) - deltaAmount;
            await prisma.customer_wallets.update({
              where: { customer_id: subscription.customer_id },
              data: { balance: newBalance, updated_at: now }
            });
            await prisma.wallet_transactions.create({
              data: {
                id: crypto.randomUUID(),
                customer_id: subscription.customer_id,
                type: deltaAmount > 0 ? 'debit' : 'credit',
                amount: Math.abs(deltaAmount),
                balance_after: newBalance,
                reference_type: 'subscription_delivery',
                reference_id: record.id,
                notes: `${deltaAmount > 0 ? 'Delivery charge' : 'Delivery correction'}: ${quantityDelivered} unit(s) on ${date}`,
                created_at: now,
                updated_at: now
              }
            });
          }
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
      const record = await prisma.delivery_records.findUnique({
        where: { id },
        include: { subscriptions: { include: { customers: true } } }
      });
      if (!record) return res.status(404).json({ success: false, message: 'Delivery record not found' });

      const recordDateStr = formatDateOnly(new Date(record.delivery_date));
      const sub = record.subscriptions;
      const now = new Date();

      // A postpaid delivery that was already billed refunds that charge —
      // unmarking means it never happened, so the customer shouldn't be
      // left paying for it.
      if (sub.wallet_auto_debit && sub.customers?.customer_type === 'postpaid') {
        const billed = Number(record.quantity_delivered) * Number(sub.rate || 0);
        if (billed !== 0) {
          const wallet = await prisma.customer_wallets.findUnique({ where: { customer_id: sub.customer_id } });
          const newBalance = Number(wallet?.balance || 0) + billed;
          await prisma.customer_wallets.update({ where: { customer_id: sub.customer_id }, data: { balance: newBalance, updated_at: now } });
          await prisma.wallet_transactions.create({
            data: {
              id: crypto.randomUUID(),
              customer_id: sub.customer_id,
              type: 'credit',
              amount: billed,
              balance_after: newBalance,
              reference_type: 'subscription_delivery',
              reference_id: record.id,
              notes: `Delivery unmarked, charge reversed: ${recordDateStr}`,
              created_at: now,
              updated_at: now
            }
          });
        }
      }

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
