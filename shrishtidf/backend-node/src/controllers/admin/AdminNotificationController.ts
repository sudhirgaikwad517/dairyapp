import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

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

async function buildAudienceWhere(filters: Record<string, any>) {
  const { isActiveFilter, customerType, city, subscriptionStatus, deliveryBoyId } = filters;
  const where: any = {};
  if (isActiveFilter === 'active') where.is_active = true;
  else if (isActiveFilter === 'inactive') where.is_active = false;
  if (customerType) where.customer_type = customerType;
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (deliveryBoyId) where.delivery_boy_id = deliveryBoyId;

  const idFilter = await subscriptionStatusIdFilter(subscriptionStatus);
  if (idFilter) where.id = idFilter;

  return where;
}

function mapHistoryRow(n: any) {
  const audience: string[] = [];
  if (n.is_active_filter === 'active') audience.push('Active Customers');
  else if (n.is_active_filter === 'inactive') audience.push('Inactive Customers');
  if (n.customer_type) audience.push(n.customer_type === 'prepaid' ? 'Prepaid' : 'Postpaid');
  if (n.city) audience.push(`City: ${n.city}`);
  if (n.subscription_status) audience.push(`Subscription: ${n.subscription_status === 'none' ? 'No Subscription' : n.subscription_status}`);
  if (n.delivery_boy_id) audience.push(n.delivery_boys ? `Delivery Boy: ${n.delivery_boys.name}` : 'Delivery Boy');

  return {
    id: n.id,
    title: n.title,
    message: n.message,
    audienceSummary: audience.length ? audience.join(', ') : 'All Customers',
    filters: {
      isActiveFilter: n.is_active_filter,
      customerType: n.customer_type,
      city: n.city,
      subscriptionStatus: n.subscription_status,
      deliveryBoyId: n.delivery_boy_id
    },
    recipientCount: n.recipient_count,
    readCount: n._count?.notification_recipients ?? undefined,
    sentBy: n.sent_by,
    createdAt: n.created_at
  };
}

export class AdminNotificationController {
  public async previewAudience(req: Request, res: Response) {
    try {
      const where = await buildAudienceWhere(req.query as Record<string, string>);
      const [count, sample] = await Promise.all([
        prisma.customers.count({ where }),
        prisma.customers.findMany({ where, select: { code: true, name: true }, take: 5, orderBy: { created_at: 'desc' } })
      ]);
      return res.status(200).json({
        success: true,
        data: { count, sample: sample.map((c: any) => `${c.code} - ${c.name || 'Unnamed'}`) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));

      const [total, rows] = await Promise.all([
        prisma.notifications.count(),
        prisma.notifications.findMany({
          include: { delivery_boys: true, _count: { select: { notification_recipients: { where: { is_read: true } } } } },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        } as any)
      ]);

      return res.status(200).json({
        success: true,
        data: {
          rows: rows.map(mapHistoryRow),
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

  public async exportHistory(_req: Request, res: Response) {
    try {
      const rows = await prisma.notifications.findMany({
        include: { delivery_boys: true },
        orderBy: { created_at: 'desc' }
      } as any);
      const header = ['Title', 'Message', 'Audience', 'Recipients', 'Sent By', 'Sent At'];
      const csvRows = rows.map((n: any) => {
        const mapped = mapHistoryRow(n);
        return [mapped.title, mapped.message, mapped.audienceSummary, mapped.recipientCount, mapped.sentBy || '', mapped.createdAt ? new Date(mapped.createdAt).toLocaleString('en-IN') : ''];
      });
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="notifications-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const notification = await prisma.notifications.findUnique({
        where: { id: req.params.id as string },
        include: { delivery_boys: true }
      } as any);
      if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));

      const [total, recipients] = await Promise.all([
        prisma.notification_recipients.count({ where: { notification_id: notification.id } }),
        prisma.notification_recipients.findMany({
          where: { notification_id: notification.id },
          include: { customers: true },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          ...mapHistoryRow(notification),
          recipients: {
            rows: recipients.map((r: any) => ({
              id: r.id,
              customerCode: r.customers?.code,
              customerName: r.customers?.name || 'Unnamed',
              isRead: r.is_read,
              readAt: r.read_at
            })),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize))
          }
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async send(req: Request, res: Response) {
    try {
      const { title, message, isActiveFilter, customerType, city, subscriptionStatus, deliveryBoyId } = req.body;
      if (!title || !String(title).trim() || !message || !String(message).trim()) {
        return res.status(422).json({ success: false, message: 'Title and message are required' });
      }

      const where = await buildAudienceWhere({ isActiveFilter, customerType, city, subscriptionStatus, deliveryBoyId });
      const recipients = await prisma.customers.findMany({ where, select: { id: true } });

      if (recipients.length === 0) {
        return res.status(422).json({ success: false, message: 'No customers match these filters — nothing was sent' });
      }

      const now = new Date();
      const notification = await prisma.notifications.create({
        data: {
          id: crypto.randomUUID(),
          title: title.trim(),
          message: message.trim(),
          is_active_filter: isActiveFilter || null,
          customer_type: customerType || null,
          city: city || null,
          subscription_status: subscriptionStatus || null,
          delivery_boy_id: deliveryBoyId || null,
          recipient_count: recipients.length,
          sent_by: 'Admin',
          created_at: now
        }
      });

      await prisma.notification_recipients.createMany({
        data: recipients.map((c: any) => ({
          id: crypto.randomUUID(),
          notification_id: notification.id,
          customer_id: c.id,
          created_at: now
        }))
      });

      return res.status(201).json({ success: true, data: { id: notification.id, recipientCount: recipients.length } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminNotificationController = new AdminNotificationController();
