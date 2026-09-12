import { Request, Response } from 'express';
import prisma from '../../db/prisma';

const ALERT_TYPES = [
  'customer_registered',
  'feedback',
  'enquiry',
  'subscription',
  'one_time_order',
  'holiday',
  'change_request',
  'wallet'
] as const;

function parseLitersFromSize(size: string | null | undefined): number {
  if (!size) return 0;
  const s = size.toLowerCase().replace(/\s+/g, '');
  const mlMatch = s.match(/([\d.]+)ml/);
  if (mlMatch) return parseFloat(mlMatch[1]) / 1000;
  const lMatch = s.match(/([\d.]+)l/);
  if (lMatch) return parseFloat(lMatch[1]);
  return 0;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function monthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export class AdminStatsController {
  public async getDashboardStats(req: Request, res: Response) {
    try {
      const zoneParam = ((req.query.zone as string) || 'all').toLowerCase();
      const zone = ['pune', 'mumbai'].includes(zoneParam) ? zoneParam : 'all';

      const now = new Date();
      const fromParam = req.query.from as string;
      const toParam = req.query.to as string;
      const rangeFrom = fromParam && !isNaN(new Date(fromParam).getTime()) ? startOfDay(new Date(fromParam)) : monthStart(now);
      const rangeTo = toParam && !isNaN(new Date(toParam).getTime()) ? endOfDay(new Date(toParam)) : monthEnd(now);

      let zoneCustomerIds: string[] | null = null;
      if (zone !== 'all') {
        const zoneCustomers = await prisma.customers.findMany({
          where: { city: { equals: zone, mode: 'insensitive' } },
          select: { id: true }
        });
        zoneCustomerIds = zoneCustomers.map((c: any) => c.id);
      }

      const customerScope: any = zoneCustomerIds ? { id: { in: zoneCustomerIds } } : {};
      const byCustomer: any = zoneCustomerIds ? { customer_id: { in: zoneCustomerIds } } : {};

      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const thisMonthStart = monthStart(now);
      const thisMonthEnd = monthEnd(now);

      // ---- Milk delivered this month (liters) ----
      const milkCategory = await prisma.product_categories.findFirst({
        where: { label: { contains: 'milk', mode: 'insensitive' } },
        select: { id: true }
      });
      let milkDeliveredThisMonth = 0;
      if (milkCategory) {
        const milkProducts = await prisma.products.findMany({
          where: { category_id: milkCategory.id },
          select: { id: true }
        });
        const milkProductIds = milkProducts.map((p: any) => p.id);
        if (milkProductIds.length > 0) {
          const milkItems = await prisma.order_items.findMany({
            where: {
              product_id: { in: milkProductIds },
              orders: {
                status: 'DELIVERED',
                delivery_date: { gte: thisMonthStart, lte: thisMonthEnd },
                ...(zoneCustomerIds ? { customer_id: { in: zoneCustomerIds } } : {})
              }
            },
            select: { size: true, quantity: true }
          });
          milkDeliveredThisMonth = milkItems.reduce(
            (acc: number, it: any) => acc + parseLitersFromSize(it.size) * it.quantity,
            0
          );
        }
      }

      const [
        customersRegistered,
        activeCustomers,
        activeSubscriptions,
        enquiriesThisMonth,
        customersRegisteredThisMonth,
        customersRegisteredToday,
        walletAgg
      ] = await Promise.all([
        prisma.customers.count({ where: customerScope }),
        prisma.customers.count({ where: { ...customerScope, is_active: true } }),
        prisma.subscriptions.count({ where: { status: 'active', ...byCustomer } }),
        prisma.leads.count({ where: { created_at: { gte: thisMonthStart, lte: thisMonthEnd } } }),
        prisma.customers.count({ where: { ...customerScope, created_at: { gte: thisMonthStart, lte: thisMonthEnd } } }),
        prisma.customers.count({ where: { ...customerScope, created_at: { gte: todayStart, lte: todayEnd } } }),
        prisma.customer_wallets.findMany({
          where: zoneCustomerIds ? { customer_id: { in: zoneCustomerIds } } : {},
          select: { balance: true }
        })
      ]);

      let totalInHandWallet = 0;
      let totalNegativeWallet = 0;
      for (const w of walletAgg) {
        const bal = Number(w.balance);
        if (bal >= 0) totalInHandWallet += bal;
        else totalNegativeWallet += bal;
      }

      // ---- Hold Request / Change Request (date range) ----
      const [holdCount, changeCount] = await Promise.all([
        prisma.activity_logs.count({
          where: { type: 'subscription', subtype: 'pause', created_at: { gte: rangeFrom, lte: rangeTo }, ...byCustomer }
        }),
        prisma.activity_logs.count({
          where: { type: 'change_request', created_at: { gte: rangeFrom, lte: rangeTo }, ...byCustomer }
        })
      ]);

      // ---- Wallet statistics (date range + today) ----
      async function walletSum(type: string, referenceType: string | null, from: Date, to: Date) {
        const where: any = { type, created_at: { gte: from, lte: to }, ...byCustomer };
        if (referenceType) where.reference_type = referenceType;
        const rows = await prisma.wallet_transactions.findMany({ where, select: { amount: true } });
        return rows.reduce((acc: number, r: any) => acc + Number(r.amount), 0);
      }

      const [
        walletTotalAmount,
        walletRefunded,
        walletCash,
        walletOnline,
        walletTodayCash,
        walletTodayOnline
      ] = await Promise.all([
        walletSum('credit', null, rangeFrom, rangeTo),
        walletSum('debit', 'refund', rangeFrom, rangeTo),
        walletSum('credit', 'topup_cash', rangeFrom, rangeTo),
        walletSum('credit', 'topup_online', rangeFrom, rangeTo),
        walletSum('credit', 'topup_cash', todayStart, todayEnd),
        walletSum('credit', 'topup_online', todayStart, todayEnd)
      ]);

      // ---- Alerts feed ----
      const alerts: Record<string, any[]> = {};
      const alertCounts: Record<string, number> = {};
      let totalAlerts = 0;

      for (const type of ALERT_TYPES) {
        const where: any = { type, is_dismissed: false };
        if (zoneCustomerIds) where.customer_id = { in: zoneCustomerIds };
        const [items, count] = await Promise.all([
          prisma.activity_logs.findMany({ where, orderBy: { created_at: 'desc' }, take: 10 }),
          prisma.activity_logs.count({ where })
        ]);
        alerts[type] = items.map((a: any) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          createdAt: a.created_at
        }));
        alertCounts[type] = count;
        totalAlerts += count;
      }

      return res.status(200).json({
        success: true,
        data: {
          zone,
          range: { from: rangeFrom, to: rangeTo },
          statistics: {
            customersRegistered,
            totalInHandWallet,
            totalNegativeWallet,
            activeCustomers,
            activeSubscriptions,
            milkDeliveredThisMonth: Math.round(milkDeliveredThisMonth * 100) / 100,
            enquiriesThisMonth,
            customersRegisteredThisMonth,
            customersRegisteredToday
          },
          holdRequest: { count: holdCount, from: rangeFrom, to: rangeTo },
          changeRequest: { count: changeCount, from: rangeFrom, to: rangeTo },
          walletStats: {
            totalAmount: walletTotalAmount,
            totalRefundedAmount: walletRefunded,
            totalRechargeCash: walletCash,
            totalRechargeOnline: walletOnline
          },
          walletStatsToday: {
            totalRecharge: walletTodayCash + walletTodayOnline,
            totalRechargeCash: walletTodayCash,
            totalRechargeOnline: walletTodayOnline
          },
          alerts: {
            types: ALERT_TYPES,
            counts: alertCounts,
            total: totalAlerts,
            items: alerts
          }
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async dismissAlert(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.activity_logs.update({
        where: { id },
        data: { is_dismissed: true }
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminStatsController = new AdminStatsController();
