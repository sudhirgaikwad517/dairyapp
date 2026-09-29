import prisma from '../db/prisma';
import crypto from 'crypto';

export type ActivityType =
  | 'customer_registered'
  | 'feedback'
  | 'complaint'
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
    subscriptionId?: string | null;
    effectiveDate?: Date | null;
    actor?: 'admin' | 'customer';
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
          subscription_id: params.subscriptionId || null,
          effective_date: params.effectiveDate || null,
          actor: params.actor || null,
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
