import { Request, Response } from 'express';
import prisma from '../../db/prisma';

const SETTING_KEY = 'referral_plan';

export class AdminReferralPlanController {
  public async show(req: Request, res: Response) {
    try {
      const row = await prisma.site_settings.findUnique({ where: { key: SETTING_KEY } });
      return res.status(200).json({ success: true, data: { content: (row?.value as any) || '' } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const { content } = req.body;
      const now = new Date();
      await prisma.site_settings.upsert({
        where: { key: SETTING_KEY },
        update: { value: content || '', updated_at: now },
        create: { key: SETTING_KEY, value: content || '', created_at: now, updated_at: now }
      });
      return res.status(200).json({ success: true, data: { content: content || '' } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminReferralPlanController = new AdminReferralPlanController();
