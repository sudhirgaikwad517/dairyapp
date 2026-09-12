import { Request, Response } from 'express';
import prisma from '../../db/prisma';

export class AdminLeadController {
  public async index(req: Request, res: Response) {
    try {
      const leads = await prisma.leads.findMany({
        orderBy: { created_at: 'desc' },
      });

      return res.status(200).json({ success: true, data: leads });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
    }
  }

  public async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: { message: 'Status is required' } });
      }

      const updatedLead = await prisma.leads.update({
        where: { id: id as string },
        data: { status, updated_at: new Date() },
      });

      return res.status(200).json({ success: true, data: updatedLead });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
    }
  }
}

export const adminLeadController = new AdminLeadController();
