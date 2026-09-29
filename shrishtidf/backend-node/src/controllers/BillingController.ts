import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { customerAuthService } from '../services/CustomerAuthService';

export class BillingController {
  // "Billing History" screen — postpaid customers' periodic bills.
  public async index(req: Request, res: Response) {
    try {
      const sessionId = (req.headers['session-id'] as string) || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const bills = await prisma.customer_billings.findMany({
        where: { customer_id: customer.id },
        orderBy: { from_date: 'desc' }
      });

      return res.status(200).json({
        success: true,
        data: bills.map((b: any) => ({
          id: b.id,
          billAmount: b.bill_amount,
          paidAmount: b.paid_amount,
          remainingAmount: b.remaining_amount,
          fromDate: b.from_date,
          toDate: b.to_date,
          status: b.status,
          createdAt: b.created_at
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const billingController = new BillingController();
