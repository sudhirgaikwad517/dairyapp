import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';
import { formatDateOnly } from '../../services/CutoffService';
import { parseDateOnly } from '../../services/SubscriptionLifecycleService';

function defaultSummaryRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: formatDateOnly(from), to: formatDateOnly(to) };
}

function buildWalletWhere(query: Record<string, any>) {
  const { name, customerType, email, deliveryBoyId, deliveryType, city } = query;
  const where: any = {};
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (customerType) where.customer_type = customerType;
  if (email) where.email = { contains: email, mode: 'insensitive' };
  if (deliveryBoyId) where.delivery_boy_id = deliveryBoyId;
  if (deliveryType) where.delivery_mode = deliveryType;
  if (city) where.city = { contains: city, mode: 'insensitive' };
  return where;
}

async function subscriptionStatusIdFilter(subscriptionStatus?: string) {
  if (!subscriptionStatus) return null;
  if (subscriptionStatus === 'none') {
    const withSubs = await prisma.subscriptions.findMany({ select: { customer_id: true }, distinct: ['customer_id'] });
    return { notIn: withSubs.map((s: any) => s.customer_id) };
  }
  const matching = await prisma.subscriptions.findMany({
    where: { status: subscriptionStatus },
    select: { customer_id: true },
    distinct: ['customer_id']
  });
  return { in: matching.map((s: any) => s.customer_id) };
}

export class AdminWalletController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildWalletWhere(query);

      const idFilter = await subscriptionStatusIdFilter(query.subscriptionStatus);
      if (idFilter) where.id = idFilter;

      if (query.walletAmount === 'negative') where.customer_wallets = { balance: { lt: 0 } };
      else if (query.walletAmount === 'positive') where.customer_wallets = { balance: { gt: 0 } };
      else if (query.walletAmount === 'zero') where.OR = [{ customer_wallets: null }, { customer_wallets: { balance: 0 } }];

      const [total, rows] = await Promise.all([
        prisma.customers.count({ where }),
        prisma.customers.findMany({
          where,
          include: { customer_wallets: true, delivery_boys: true },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const customerIds = rows.map((c: any) => c.id);
      const refunds = customerIds.length
        ? await prisma.wallet_transactions.groupBy({
            by: ['customer_id'],
            where: { customer_id: { in: customerIds }, type: 'debit', reference_type: 'refund' },
            _sum: { amount: true }
          })
        : [];
      const refundMap = new Map(refunds.map((r: any) => [r.customer_id, Number(r._sum.amount || 0)]));

      const mapped = rows.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        customerType: c.customer_type,
        mobile: c.phone,
        email: c.email,
        address: c.address,
        city: c.city,
        deliveryBoy: c.delivery_boys?.name || null,
        walletAmount: c.customer_wallets ? Number(c.customer_wallets.balance) : 0,
        refund: refundMap.get(c.id) || 0
      }));

      return res.status(200).json({
        success: true,
        data: { rows: mapped, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportWalletReport(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where = buildWalletWhere(query);
      const idFilter = await subscriptionStatusIdFilter(query.subscriptionStatus);
      if (idFilter) where.id = idFilter;
      if (query.walletAmount === 'negative') where.customer_wallets = { balance: { lt: 0 } };
      else if (query.walletAmount === 'positive') where.customer_wallets = { balance: { gt: 0 } };
      else if (query.walletAmount === 'zero') where.OR = [{ customer_wallets: null }, { customer_wallets: { balance: 0 } }];

      const rows = await prisma.customers.findMany({
        where,
        include: { customer_wallets: true, delivery_boys: true },
        orderBy: { created_at: 'desc' }
      });

      const header = ['Customer ID', 'Customer Name', 'Type', 'Mobile', 'Email', 'Address', 'Wallet Amount'];
      const csvRows = rows.map((c: any) => [
        c.code || '', c.name || '', c.customer_type, c.phone || '', c.email || '', c.address || '',
        c.customer_wallets ? Number(c.customer_wallets.balance) : 0
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="customer-wallet-report-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async addMoney(req: Request, res: Response) {
    try {
      const { customerId, amount, remark } = req.body;
      if (!customerId || !amount || Number(amount) <= 0 || !remark) {
        return res.status(422).json({ success: false, message: 'Customer, credit amount and remark are required' });
      }

      const customer = await prisma.customers.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(422).json({ success: false, message: 'Selected customer does not exist' });

      const now = new Date();
      const newBalance = await prisma.$transaction(async (tx) => {
        let wallet = await tx.customer_wallets.findUnique({ where: { customer_id: customerId } });
        if (!wallet) {
          wallet = await tx.customer_wallets.create({ data: { id: crypto.randomUUID(), customer_id: customerId, balance: 0, created_at: now, updated_at: now } });
        }
        const updatedBalance = Number(wallet.balance) + Number(amount);
        await tx.customer_wallets.update({ where: { customer_id: customerId }, data: { balance: updatedBalance, updated_at: now } });
        await tx.wallet_transactions.create({
          data: {
            id: crypto.randomUUID(),
            customer_id: customerId,
            type: 'credit',
            amount: Number(amount),
            balance_after: updatedBalance,
            reference_type: 'topup_cash',
            notes: remark,
            created_at: now,
            updated_at: now
          }
        });
        return updatedBalance;
      });

      return res.status(201).json({ success: true, data: { balance: newBalance } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async debitMoney(req: Request, res: Response) {
    try {
      const { customerId, amount, remark } = req.body;
      if (!customerId || !amount || Number(amount) <= 0 || !remark) {
        return res.status(422).json({ success: false, message: 'Customer, debit amount and remark are required' });
      }

      const customer = await prisma.customers.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(422).json({ success: false, message: 'Selected customer does not exist' });

      const now = new Date();
      const newBalance = await prisma.$transaction(async (tx) => {
        let wallet = await tx.customer_wallets.findUnique({ where: { customer_id: customerId } });
        if (!wallet) {
          wallet = await tx.customer_wallets.create({ data: { id: crypto.randomUUID(), customer_id: customerId, balance: 0, created_at: now, updated_at: now } });
        }
        const updatedBalance = Number(wallet.balance) - Number(amount);
        await tx.customer_wallets.update({ where: { customer_id: customerId }, data: { balance: updatedBalance, updated_at: now } });
        await tx.wallet_transactions.create({
          data: {
            id: crypto.randomUUID(),
            customer_id: customerId,
            type: 'debit',
            amount: Number(amount),
            balance_after: updatedBalance,
            reference_type: 'admin_debit',
            notes: remark,
            created_at: now,
            updated_at: now
          }
        });
        return updatedBalance;
      });

      return res.status(201).json({ success: true, data: { balance: newBalance } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  private lowBalanceWhere(query: Record<string, string>) {
    const threshold = query.threshold ? Number(query.threshold) : 300;
    const where: any = { customer_wallets: { balance: { gt: 0, lt: threshold } } };
    if (query.customerId) where.id = query.customerId;
    return where;
  }

  public async lowBalance(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));
      const where = this.lowBalanceWhere(query);

      const [total, rows] = await Promise.all([
        prisma.customers.count({ where }),
        prisma.customers.findMany({
          where,
          include: { customer_wallets: true },
          orderBy: { customer_wallets: { balance: 'asc' } },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const mapped = rows.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        mobile: c.phone,
        email: c.email,
        walletAmount: c.customer_wallets ? Number(c.customer_wallets.balance) : 0
      }));

      return res.status(200).json({
        success: true,
        data: { rows: mapped, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportLowBalance(req: Request, res: Response) {
    try {
      const where = this.lowBalanceWhere(req.query as Record<string, string>);
      const rows = await prisma.customers.findMany({
        where,
        include: { customer_wallets: true },
        orderBy: { customer_wallets: { balance: 'asc' } }
      });

      const header = ['Customer ID', 'Customer Name', 'Mobile', 'Email', 'Wallet Amount'];
      const csvRows = rows.map((c: any) => [c.code || '', c.name || '', c.phone || '', c.email || '', c.customer_wallets ? Number(c.customer_wallets.balance) : 0]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="low-wallet-balance-report-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  private async computeSummary(query: Record<string, string>) {
    const defaults = defaultSummaryRange();
    const fromStr = query.from || defaults.from;
    const toStr = query.to || defaults.to;
    const from = parseDateOnly(fromStr);
    const to = new Date(parseDateOnly(toStr).getTime() + 24 * 60 * 60 * 1000 - 1);

    async function walletSum(type: string, referenceType: string | null) {
      const where: any = { type, created_at: { gte: from, lte: to } };
      if (referenceType) where.reference_type = referenceType;
      const rows = await prisma.wallet_transactions.findMany({ where, select: { amount: true } });
      return rows.reduce((acc: number, r: any) => acc + Number(r.amount), 0);
    }

    const [totalRecharge, totalCashback, totalRefunded] = await Promise.all([
      walletSum('credit', null),
      walletSum('credit', 'cashback'),
      walletSum('debit', 'refund')
    ]);

    return { from: fromStr, to: toStr, totalRecharge, totalCashback, totalRefunded };
  }

  public async summaryReport(req: Request, res: Response) {
    try {
      const summary = await this.computeSummary(req.query as Record<string, string>);
      return res.status(200).json({ success: true, data: summary });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportSummaryReport(req: Request, res: Response) {
    try {
      const summary = await this.computeSummary(req.query as Record<string, string>);
      const header = ['From', 'To', 'Total Recharge Amount', 'Total Cashback Amount', 'Total Refunded Amount'];
      const csvRows = [[summary.from, summary.to, summary.totalRecharge, summary.totalCashback, summary.totalRefunded]];
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="wallet-summary-report-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  /// Pending (and, on request, past) "Request Cash" top-ups awaiting admin review.
  public async cashRequests(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));
      const status = query.status && query.status !== 'all' ? query.status : 'pending';
      const where: any = status === 'all' ? {} : { status };
      if (query.customerName) {
        where.customers = { name: { contains: query.customerName, mode: 'insensitive' } };
      }

      const [total, rows] = await Promise.all([
        prisma.wallet_cash_requests.count({ where }),
        prisma.wallet_cash_requests.findMany({
          where,
          include: { customers: true },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const mapped = rows.map((r: any) => ({
        id: r.id,
        customerId: r.customer_id,
        customerName: r.customers?.name || '',
        customerCode: r.customers?.code || '',
        mobile: r.customers?.phone || '',
        amount: Number(r.amount),
        requestedDate: r.requested_date,
        email: r.email,
        status: r.status,
        notes: r.notes,
        reviewedBy: r.reviewed_by,
        reviewedAt: r.reviewed_at,
        createdAt: r.created_at
      }));

      return res.status(200).json({
        success: true,
        data: { rows: mapped, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async approveCashRequest(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const reviewer = req.authUser?.type === 'admin' ? req.authUser.email : req.authUser?.name;

      const request = await prisma.wallet_cash_requests.findUnique({ where: { id } });
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
      if (request.status !== 'pending') {
        return res.status(422).json({ success: false, message: `This request was already ${request.status}` });
      }

      const now = new Date();
      const newBalance = await prisma.$transaction(async (tx) => {
        let wallet = await tx.customer_wallets.findUnique({ where: { customer_id: request.customer_id } });
        if (!wallet) {
          wallet = await tx.customer_wallets.create({
            data: { id: crypto.randomUUID(), customer_id: request.customer_id, balance: 0, created_at: now, updated_at: now }
          });
        }
        const updatedBalance = Number(wallet.balance) + Number(request.amount);
        await tx.customer_wallets.update({
          where: { customer_id: request.customer_id },
          data: { balance: updatedBalance, updated_at: now }
        });
        await tx.wallet_transactions.create({
          data: {
            id: crypto.randomUUID(),
            customer_id: request.customer_id,
            type: 'credit',
            amount: Number(request.amount),
            balance_after: updatedBalance,
            reference_type: 'topup_cash',
            reference_id: request.id,
            notes: 'Cash pickup collected and credited',
            created_at: now,
            updated_at: now
          }
        });
        await tx.wallet_cash_requests.update({
          where: { id },
          data: { status: 'approved', reviewed_by: reviewer || null, reviewed_at: now, updated_at: now }
        });
        return updatedBalance;
      });

      return res.status(200).json({ success: true, data: { balance: newBalance } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async rejectCashRequest(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const reviewer = req.authUser?.type === 'admin' ? req.authUser.email : req.authUser?.name;

      const request = await prisma.wallet_cash_requests.findUnique({ where: { id } });
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
      if (request.status !== 'pending') {
        return res.status(422).json({ success: false, message: `This request was already ${request.status}` });
      }

      const now = new Date();
      await prisma.wallet_cash_requests.update({
        where: { id },
        data: {
          status: 'rejected',
          notes: reason || null,
          reviewed_by: reviewer || null,
          reviewed_at: now,
          updated_at: now
        }
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async transactions(req: Request, res: Response) {
    try {
      const customerId = req.params.customerId as string;
      const rows = await prisma.wallet_transactions.findMany({
        where: { customer_id: customerId },
        orderBy: { created_at: 'desc' },
        take: 100
      });
      return res.status(200).json({
        success: true,
        data: rows.map((r: any) => ({
          id: r.id,
          type: r.type,
          amount: Number(r.amount),
          balanceAfter: Number(r.balance_after),
          referenceType: r.reference_type,
          notes: r.notes,
          createdAt: r.created_at
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminWalletController = new AdminWalletController();
