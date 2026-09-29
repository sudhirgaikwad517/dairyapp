import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { customerAuthService } from '../services/CustomerAuthService';

const DEFAULT_PLAN = 'Invite your friends and family to Shrishti Dairy Farm. When they place their first order using your referral code, you both earn ₹50 wallet credit.';

export class ReferralController {
  public async index(req: Request, res: Response) {
    try {
      const sessionId = (req.headers['session-id'] as string) || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const [referrals, setting] = await Promise.all([
        prisma.referrals.findMany({
          where: { referrer_customer_id: customer.id },
          orderBy: { created_at: 'desc' }
        }),
        prisma.site_settings.findUnique({ where: { key: 'referral_plan' } })
      ]);

      const earned = referrals.filter((r: any) => r.status === 'rewarded').reduce((sum: number, r: any) => sum + r.reward_amount, 0);
      const pending = referrals.filter((r: any) => r.status === 'pending').length;

      const planValue = setting?.value as any;
      const planText = typeof planValue === 'string' ? planValue : (planValue?.text || DEFAULT_PLAN);

      return res.status(200).json({
        success: true,
        data: {
          referralCode: customer.referral_code,
          totalReferrals: referrals.length,
          pendingReferrals: pending,
          totalEarned: earned,
          planText,
          referrals: referrals.map((r: any) => ({
            id: r.id,
            phone: r.referred_phone,
            status: r.status,
            rewardAmount: r.reward_amount,
            createdAt: r.created_at
          }))
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const referralController = new ReferralController();
