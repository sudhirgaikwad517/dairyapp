import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';
import { formatDateOnly } from '../../services/CutoffService';
import { parseDateOnly } from '../../services/SubscriptionLifecycleService';

function mapBilling(b: any) {
  return {
    id: b.id,
    customerId: b.customer_id,
    customerCode: b.customers?.code,
    customerName: b.customers?.name,
    billAmount: b.bill_amount,
    paidAmount: b.paid_amount,
    remainingAmount: b.remaining_amount,
    fromDate: b.from_date,
    toDate: b.to_date,
    status: b.status,
    createdAt: b.created_at
  };
}

function buildBillingWhere(query: Record<string, any>) {
  const { customerId, dateFrom, dateTo, status } = query;
  const where: any = {};
  if (customerId) where.customer_id = customerId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    // A billing period "matches" a date filter if the period overlaps the requested date/range.
    where.AND = [];
    if (dateFrom) where.AND.push({ to_date: { gte: parseDateOnly(dateFrom) } });
    if (dateTo) where.AND.push({ from_date: { lte: parseDateOnly(dateTo) } });
  }
  return where;
}

export class AdminBillingController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildBillingWhere(query);

      const [total, rows] = await Promise.all([
        prisma.customer_billings.count({ where }),
        prisma.customer_billings.findMany({
          where,
          include: { customers: true },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map(mapBilling), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportBillings(req: Request, res: Response) {
    try {
      const where = buildBillingWhere(req.query as Record<string, string>);
      const rows = await prisma.customer_billings.findMany({ where, include: { customers: true }, orderBy: { created_at: 'desc' } });

      const header = ['Customer', 'From Date', 'To Date', 'Bill Amount', 'Paid Amount', 'Remaining Amount', 'Status'];
      const csvRows = rows.map((b: any) => [
        `${b.customers?.code || ''} - ${b.customers?.name || ''}`, formatDateOnly(new Date(b.from_date)), formatDateOnly(new Date(b.to_date)),
        b.bill_amount, b.paid_amount, b.remaining_amount, b.status
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="customer-billing-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const billing = await prisma.customer_billings.findUnique({ where: { id: req.params.id as string }, include: { customers: true } });
      if (!billing) return res.status(404).json({ success: false, message: 'Billing not found' });
      return res.status(200).json({ success: true, data: mapBilling(billing) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { customerId, billAmount, paidAmount, fromDate, toDate } = req.body;
      if (!customerId || billAmount === undefined || !fromDate || !toDate) {
        return res.status(422).json({ success: false, message: 'Customer, bill amount, from date and to date are required' });
      }
      const from = parseDateOnly(fromDate);
      const to = parseDateOnly(toDate);
      if (from > to) return res.status(422).json({ success: false, message: 'From Date must be on or before To Date' });

      const customer = await prisma.customers.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(422).json({ success: false, message: 'Selected customer does not exist' });

      const bill = Number(billAmount);
      const paid = Number(paidAmount || 0);
      if (paid < 0 || bill < 0) return res.status(422).json({ success: false, message: 'Amounts cannot be negative' });
      const remaining = bill - paid;

      const now = new Date();
      const billing = await prisma.customer_billings.create({
        data: {
          id: crypto.randomUUID(),
          customer_id: customerId,
          bill_amount: bill,
          paid_amount: paid,
          remaining_amount: remaining,
          from_date: from,
          to_date: to,
          status: remaining <= 0 ? 'paid' : 'unpaid',
          created_at: now,
          updated_at: now
        },
        include: { customers: true }
      });
      return res.status(201).json({ success: true, data: mapBilling(billing) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.customer_billings.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Billing not found' });

      const { billAmount, paidAmount, fromDate, toDate } = req.body;
      const bill = billAmount !== undefined ? Number(billAmount) : existing.bill_amount;
      const paid = paidAmount !== undefined ? Number(paidAmount) : existing.paid_amount;
      if (bill < 0 || paid < 0) return res.status(422).json({ success: false, message: 'Amounts cannot be negative' });

      const from = fromDate !== undefined ? parseDateOnly(fromDate) : existing.from_date;
      const to = toDate !== undefined ? parseDateOnly(toDate) : existing.to_date;
      if (from > to) return res.status(422).json({ success: false, message: 'From Date must be on or before To Date' });

      const remaining = bill - paid;
      const billing = await prisma.customer_billings.update({
        where: { id },
        data: {
          bill_amount: bill,
          paid_amount: paid,
          remaining_amount: remaining,
          from_date: from,
          to_date: to,
          status: remaining <= 0 ? 'paid' : 'unpaid',
          updated_at: new Date()
        },
        include: { customers: true }
      });
      return res.status(200).json({ success: true, data: mapBilling(billing) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminBillingController = new AdminBillingController();
