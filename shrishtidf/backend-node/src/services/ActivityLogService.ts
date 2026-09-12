import prisma from '../db/prisma';
import crypto from 'crypto';

export type ActivityType =
  | 'customer_registered'
  | 'feedback'
  | 'enquiry'
  | 'subscription'
  | 'one_time_order'
  | 'holiday'
  | 'change_request'
  | 'wallet';

class ActivityLogService {
  public async log(params: {
    type: ActivityType;
    subtype?: string;
    title: string;
    message: string;
    customerId?: string | null;
  }) {
    try {
      await prisma.activity_logs.create({
        data: {
          id: crypto.randomUUID(),
          type: params.type,
          subtype: params.subtype || null,
          title: params.title,
          message: params.message,
          customer_id: params.customerId || null,
          created_at: new Date(),
        },
      });
    } catch (error) {
      // Activity logging must never break the primary operation it's attached to.
      console.error('Failed to write activity log:', error);
    }
  }
}

export const activityLogService = new ActivityLogService();
