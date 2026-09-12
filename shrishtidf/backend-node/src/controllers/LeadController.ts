import { Request, Response } from 'express';
import prisma from '../db/prisma';
import crypto from 'crypto';
import { activityLogService } from '../services/ActivityLogService';

export class LeadController {
  public async create(req: Request, res: Response) {
    try {
      const { name, phone, source, message } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ success: false, error: { message: 'Name and phone are required' } });
      }

      await prisma.leads.create({
        data: {
          id: crypto.randomUUID(),
          name,
          phone,
          source: source || 'free_sample',
          status: 'new',
          message: message || null,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      await activityLogService.log({
        type: 'enquiry',
        title: 'New Enquiry',
        message: `${name} (${phone}) submitted an enquiry${message ? `: ${message}` : '.'}`
      });

      return res.status(200).json({ success: true, data: {} });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
    }
  }
}

export const leadController = new LeadController();
