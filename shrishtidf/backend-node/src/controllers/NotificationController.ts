import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { customerAuthService } from '../services/CustomerAuthService';

function sessionId(req: Request) {
  return (req.headers['session-id'] as string) || req.cookies?.session_id;
}

export class NotificationController {
  public async index(req: Request, res: Response) {
    try {
      const customer = await customerAuthService.customerForSession(sessionId(req));
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const rows = await prisma.notification_recipients.findMany({
        where: { customer_id: customer.id },
        include: { notifications: true },
        orderBy: { created_at: 'desc' },
        take: 50
      });

      return res.status(200).json({
        success: true,
        data: rows.map((r: any) => ({
          id: r.id,
          title: r.notifications.title,
          message: r.notifications.message,
          isRead: r.is_read,
          readAt: r.read_at,
          createdAt: r.created_at
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async unreadCount(req: Request, res: Response) {
    try {
      const customer = await customerAuthService.customerForSession(sessionId(req));
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const count = await prisma.notification_recipients.count({ where: { customer_id: customer.id, is_read: false } });
      return res.status(200).json({ success: true, data: { count } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async markRead(req: Request, res: Response) {
    try {
      const customer = await customerAuthService.customerForSession(sessionId(req));
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const recipient = await prisma.notification_recipients.findUnique({ where: { id: req.params.id as string } });
      if (!recipient || recipient.customer_id !== customer.id) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      const updated = await prisma.notification_recipients.update({
        where: { id: recipient.id },
        data: { is_read: true, read_at: new Date() }
      });
      return res.status(200).json({ success: true, data: { id: updated.id, isRead: updated.is_read } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async markAllRead(req: Request, res: Response) {
    try {
      const customer = await customerAuthService.customerForSession(sessionId(req));
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      await prisma.notification_recipients.updateMany({
        where: { customer_id: customer.id, is_read: false },
        data: { is_read: true, read_at: new Date() }
      });
      return res.status(200).json({ success: true, data: { updated: true } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const notificationController = new NotificationController();
