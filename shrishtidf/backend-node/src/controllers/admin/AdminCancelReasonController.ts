import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function buildWhere(query: Record<string, any>) {
  const { reason, status } = query;
  const where: any = {};
  if (reason) where.reason = { contains: reason, mode: 'insensitive' };
  if (status) where.is_active = status === 'active';
  return where;
}

export class AdminCancelReasonController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where = buildWhere(query);
      // Public/lite callers (e.g. the app's future cancel-subscription screen) only want active reasons.
      if (query.activeOnly === 'true') where.is_active = true;

      const reasons = await prisma.cancel_reasons.findMany({ where, orderBy: { created_at: 'desc' } });
      return res.status(200).json({
        success: true,
        data: reasons.map((r: any) => ({ id: r.id, reason: r.reason, isActive: r.is_active }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportReasons(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const reasons = await prisma.cancel_reasons.findMany({ where, orderBy: { created_at: 'desc' } });
      const header = ['Reason', 'Status'];
      const csvRows = reasons.map((r: any) => [r.reason, r.is_active ? 'Activated' : 'Deactivated']);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="cancel-reasons-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const reason = await prisma.cancel_reasons.findUnique({ where: { id: req.params.id as string } });
      if (!reason) return res.status(404).json({ success: false, message: 'Cancel reason not found' });
      return res.status(200).json({ success: true, data: reason });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { reason, status } = req.body;
      if (!reason) return res.status(422).json({ success: false, message: 'Reason is required' });

      const now = new Date();
      const created = await prisma.cancel_reasons.create({
        data: { id: crypto.randomUUID(), reason, is_active: status !== false, created_at: now, updated_at: now }
      });
      return res.status(201).json({ success: true, data: { reason: created } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const { reason, status } = req.body;
      const data: any = { updated_at: new Date() };
      if (reason !== undefined) data.reason = reason;
      if (status !== undefined) data.is_active = !!status;

      const updated = await prisma.cancel_reasons.update({ where: { id: req.params.id as string }, data });
      return res.status(200).json({ success: true, data: { reason: updated } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminCancelReasonController = new AdminCancelReasonController();
