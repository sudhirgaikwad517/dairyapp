import { Request, Response } from 'express';
import prisma from '../db/prisma';
import crypto from 'crypto';
import { customerAuthService } from '../services/CustomerAuthService';
import { activityLogService } from '../services/ActivityLogService';

export class FeedbackController {
  public async create(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);

      if (!customer) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });
      }

      const { rating, comment, type, subject } = req.body;
      const feedbackType = type === 'complaint' ? 'complaint' : 'feedback';

      let ratingNum: number | null = null;
      if (feedbackType === 'feedback') {
        ratingNum = Number(rating);
        if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
          return res.status(422).json({ success: false, message: 'Rating must be between 1 and 5' });
        }
      } else if (!comment || !String(comment).trim()) {
        return res.status(422).json({ success: false, message: 'Please describe your complaint' });
      }

      const feedback = await prisma.customer_feedback.create({
        data: {
          id: crypto.randomUUID(),
          customer_id: customer.id,
          rating: ratingNum,
          comment: comment || null,
          type: feedbackType,
          subject: subject || null,
          created_at: new Date()
        }
      });

      await activityLogService.log({
        type: feedbackType === 'complaint' ? 'complaint' : 'feedback',
        title: feedbackType === 'complaint' ? 'New Complaint' : 'New Feedback',
        message: feedbackType === 'complaint'
          ? `${customer.name || customer.phone} raised a complaint${subject ? ` (${subject})` : ''}: ${comment}`
          : `${customer.name || customer.phone} rated ${ratingNum}/5${comment ? `: ${comment}` : '.'}`,
        customerId: customer.id
      });

      return res.status(201).json({ success: true, data: { feedback } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const feedbackController = new FeedbackController();
