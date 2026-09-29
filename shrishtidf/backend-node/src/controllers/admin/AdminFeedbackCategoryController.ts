import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function buildWhere(query: Record<string, any>) {
  const { name, status } = query;
  const where: any = {};
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (status) where.is_active = status === 'active';
  return where;
}

export class AdminFeedbackCategoryController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where = buildWhere(query);
      if (query.activeOnly === 'true') where.is_active = true;

      const [categories, usageCounts] = await Promise.all([
        prisma.feedback_categories.findMany({ where, orderBy: { created_at: 'desc' } }),
        prisma.customer_feedback.groupBy({ by: ['feedback_category_id'], _count: { _all: true } })
      ]);
      const usageMap = new Map(usageCounts.map((u: any) => [u.feedback_category_id, u._count._all]));

      return res.status(200).json({
        success: true,
        data: categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          isActive: c.is_active,
          usageCount: usageMap.get(c.id) || 0
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportCategories(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const categories = await prisma.feedback_categories.findMany({ where, orderBy: { created_at: 'desc' } });
      const header = ['Feedback Option', 'Status'];
      const csvRows = categories.map((c: any) => [c.name, c.is_active ? 'Activated' : 'Deactivated']);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="feedback-master-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const category = await prisma.feedback_categories.findUnique({ where: { id: req.params.id as string } });
      if (!category) return res.status(404).json({ success: false, message: 'Feedback option not found' });
      return res.status(200).json({ success: true, data: { id: category.id, name: category.name, isActive: category.is_active } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { name, status } = req.body;
      if (!name || !String(name).trim()) return res.status(422).json({ success: false, message: 'Feedback option name is required' });

      const existing = await prisma.feedback_categories.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' } } });
      if (existing) return res.status(422).json({ success: false, message: 'This feedback option already exists' });

      const now = new Date();
      const created = await prisma.feedback_categories.create({
        data: { id: crypto.randomUUID(), name: name.trim(), is_active: status !== false, created_at: now, updated_at: now }
      });
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const { name, status } = req.body;
      const data: any = { updated_at: new Date() };
      if (name !== undefined) {
        if (!String(name).trim()) return res.status(422).json({ success: false, message: 'Feedback option name is required' });
        data.name = name.trim();
      }
      if (status !== undefined) data.is_active = !!status;

      const updated = await prisma.feedback_categories.update({ where: { id: req.params.id as string }, data });
      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminFeedbackCategoryController = new AdminFeedbackCategoryController();
