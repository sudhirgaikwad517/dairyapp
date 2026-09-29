import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';
import { formatDateOnly } from '../../services/CutoffService';
import { parseDateOnly } from '../../services/SubscriptionLifecycleService';
import { activityLogService } from '../../services/ActivityLogService';

function mapVacation(v: any) {
  return {
    id: v.id,
    customerId: v.customer_id,
    customerCode: v.customers?.code,
    customerName: v.customers?.name,
    fromDate: v.from_date,
    toDate: v.to_date,
    remark: v.remark,
    entryBy: v.entry_by,
    endedBy: v.ended_by,
    endedAt: v.ended_at,
    isActive: !v.ended_by && formatDateOnly(new Date(v.to_date)) >= formatDateOnly(new Date()),
    createdAt: v.created_at
  };
}

export class AdminVacationController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));

      const where: any = {};
      if (query.customerId) where.customer_id = query.customerId;
      if (query.fromDate) where.to_date = { gte: parseDateOnly(query.fromDate) };
      if (query.toDate) where.from_date = { ...(where.from_date || {}), lte: parseDateOnly(query.toDate) };

      const [total, rows] = await Promise.all([
        prisma.vacations.count({ where }),
        prisma.vacations.findMany({
          where,
          include: { customers: true },
          orderBy: { from_date: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map(mapVacation), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportVacations(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where: any = {};
      if (query.customerId) where.customer_id = query.customerId;

      const rows = await prisma.vacations.findMany({ where, include: { customers: true }, orderBy: { from_date: 'desc' } });
      const header = ['Customer', 'From Date', 'To Date', 'Remark', 'Entry By', 'Ended By'];
      const csvRows = rows.map((v: any) => [
        v.customers?.name || '', formatDateOnly(new Date(v.from_date)), formatDateOnly(new Date(v.to_date)),
        v.remark || '', v.entry_by || '', v.ended_by || ''
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="vacations-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { customerId, fromDate, toDate, remark } = req.body;
      if (!customerId || !fromDate || !toDate) {
        return res.status(422).json({ success: false, message: 'Customer, From Date and To Date are required' });
      }
      const from = parseDateOnly(fromDate);
      const to = parseDateOnly(toDate);
      if (from > to) return res.status(422).json({ success: false, message: 'From Date must be on or before To Date' });

      const customer = await prisma.customers.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(422).json({ success: false, message: 'Selected customer does not exist' });

      const now = new Date();
      const vacation = await prisma.vacations.create({
        data: {
          id: crypto.randomUUID(),
          customer_id: customerId,
          from_date: from,
          to_date: to,
          remark: remark || null,
          entry_by: 'admin',
          created_at: now,
          updated_at: now
        },
        include: { customers: true }
      });

      await activityLogService.log({
        type: 'holiday',
        subtype: 'vacation_start',
        title: 'Vacation Scheduled',
        message: `${customer.name || customer.phone} marked on vacation from ${formatDateOnly(from)} to ${formatDateOnly(to)}.${remark ? ` Remark: ${remark}.` : ''}`,
        customerId: customerId,
        effectiveDate: from,
        actor: 'admin'
      });

      return res.status(201).json({ success: true, data: mapVacation(vacation) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async endEarly(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.vacations.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Vacation not found' });

      const today = parseDateOnly(formatDateOnly(new Date()));
      const newToDate = today < existing.from_date ? existing.from_date : today;

      const vacation = await prisma.vacations.update({
        where: { id },
        data: { to_date: newToDate, ended_by: 'admin', ended_at: new Date(), updated_at: new Date() },
        include: { customers: true }
      });

      await activityLogService.log({
        type: 'holiday',
        subtype: 'vacation_end',
        title: 'Vacation Ended Early',
        message: `${vacation.customers?.name || 'Customer'}'s vacation ended early on ${formatDateOnly(newToDate)}.`,
        customerId: vacation.customer_id,
        effectiveDate: newToDate,
        actor: 'admin'
      });

      return res.status(200).json({ success: true, data: mapVacation(vacation) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminVacationController = new AdminVacationController();
