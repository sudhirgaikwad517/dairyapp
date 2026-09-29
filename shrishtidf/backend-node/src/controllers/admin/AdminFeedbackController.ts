import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

export const FEEDBACK_STATUSES = ['new', 'in_progress', 'resolved', 'closed'] as const;
export const FEEDBACK_MODES = ['app', 'website', 'call', 'whatsapp', 'email'] as const;

function buildWhere(query: Record<string, any>) {
  const { dateFrom, dateTo, customerId, feedbackCategoryId, status, city, feedbackMode, type } = query;
  const where: any = {};

  if (dateFrom || dateTo) {
    where.created_at = {};
    if (dateFrom) where.created_at.gte = new Date(`${dateFrom}T00:00:00`);
    if (dateTo) where.created_at.lte = new Date(`${dateTo}T23:59:59.999`);
  }
  if (customerId) where.customer_id = customerId;
  if (feedbackCategoryId) where.feedback_category_id = feedbackCategoryId;
  if (status) where.status = status;
  if (feedbackMode) where.feedback_mode = feedbackMode;
  if (type) where.type = type;
  if (city) where.customers = { city: { contains: city, mode: 'insensitive' } };

  return where;
}

function mapFeedback(f: any) {
  return {
    id: f.id,
    customerId: f.customer_id,
    customerCode: f.customers?.code || null,
    customerName: f.customers?.name || 'Unnamed',
    customerCity: f.customers?.city || null,
    customerPhone: f.customers?.phone || null,
    rating: f.rating,
    comment: f.comment,
    type: f.type || 'feedback',
    subject: f.subject || null,
    feedbackMode: f.feedback_mode,
    status: f.status,
    categoryId: f.feedback_category_id,
    categoryName: f.feedback_categories?.name || null,
    reply: f.reply,
    repliedBy: f.replied_by,
    repliedAt: f.replied_at,
    entryBy: f.entry_by,
    createdAt: f.created_at,
    updatedAt: f.updated_at
  };
}

const includeRelations = { customers: true, feedback_categories: true };

export class AdminFeedbackController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildWhere(query);

      const [total, rows] = await Promise.all([
        prisma.customer_feedback.count({ where }),
        prisma.customer_feedback.findMany({
          where,
          include: includeRelations,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          rows: rows.map(mapFeedback),
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportFeedback(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const rows = await prisma.customer_feedback.findMany({ where, include: includeRelations, orderBy: { created_at: 'desc' } });

      const header = ['Customer', 'Date', 'Type', 'Subject', 'Mode', 'Status', 'Category', 'Comment', 'Reply', 'Entry By'];
      const csvRows = rows.map((f: any) => [
        f.customers?.name || '', f.created_at ? new Date(f.created_at).toLocaleString('en-IN') : '',
        f.type || 'feedback', f.subject || '', f.feedback_mode, f.status, f.feedback_categories?.name || '', f.comment || '', f.reply || '', f.entry_by
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="feedback-report-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const feedback = await prisma.customer_feedback.findUnique({
        where: { id: req.params.id as string },
        include: includeRelations
      });
      if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

      const history = await prisma.feedback_status_logs.findMany({
        where: { feedback_id: feedback.id },
        orderBy: { created_at: 'desc' }
      });

      return res.status(200).json({
        success: true,
        data: {
          ...mapFeedback(feedback),
          history: history.map((h: any) => ({ id: h.id, status: h.status, note: h.note, changedBy: h.changed_by, createdAt: h.created_at }))
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { customerId, feedbackMode, status, feedbackCategoryId, comment } = req.body;
      if (!customerId || !feedbackMode) {
        return res.status(422).json({ success: false, message: 'Customer and feedback mode are required' });
      }
      if (!FEEDBACK_MODES.includes(feedbackMode)) {
        return res.status(422).json({ success: false, message: 'Invalid feedback mode' });
      }
      const resolvedStatus = status && FEEDBACK_STATUSES.includes(status) ? status : 'new';

      const customer = await prisma.customers.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(422).json({ success: false, message: 'Selected customer does not exist' });

      const now = new Date();
      const created = await prisma.customer_feedback.create({
        data: {
          id: crypto.randomUUID(),
          customer_id: customerId,
          feedback_mode: feedbackMode,
          status: resolvedStatus,
          feedback_category_id: feedbackCategoryId || null,
          comment: comment || null,
          entry_by: 'admin',
          created_at: now,
          updated_at: now
        }
      });

      await prisma.feedback_status_logs.create({
        data: { id: crypto.randomUUID(), feedback_id: created.id, status: resolvedStatus, changed_by: 'Admin', note: 'Feedback created by admin', created_at: now }
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async updateStatus(req: Request, res: Response) {
    try {
      const { status, note } = req.body;
      if (!status || !FEEDBACK_STATUSES.includes(status)) {
        return res.status(422).json({ success: false, message: 'A valid status is required' });
      }

      const feedback = await prisma.customer_feedback.findUnique({ where: { id: req.params.id as string } });
      if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

      const now = new Date();
      const updated = await prisma.customer_feedback.update({
        where: { id: feedback.id },
        data: { status, updated_at: now }
      });

      await prisma.feedback_status_logs.create({
        data: { id: crypto.randomUUID(), feedback_id: feedback.id, status, changed_by: 'Admin', note: note || null, created_at: now }
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async reply(req: Request, res: Response) {
    try {
      const { reply, resolve } = req.body;
      if (!reply || !String(reply).trim()) {
        return res.status(422).json({ success: false, message: 'Reply text is required' });
      }

      const feedback = await prisma.customer_feedback.findUnique({ where: { id: req.params.id as string } });
      if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

      const now = new Date();
      const nextStatus = resolve === false ? feedback.status : 'resolved';
      const updated = await prisma.customer_feedback.update({
        where: { id: feedback.id },
        data: { reply: reply.trim(), replied_by: 'Admin', replied_at: now, status: nextStatus, updated_at: now }
      });

      if (nextStatus !== feedback.status) {
        await prisma.feedback_status_logs.create({
          data: { id: crypto.randomUUID(), feedback_id: feedback.id, status: nextStatus, changed_by: 'Admin', note: 'Auto-updated after admin reply', created_at: now }
        });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminFeedbackController = new AdminFeedbackController();
