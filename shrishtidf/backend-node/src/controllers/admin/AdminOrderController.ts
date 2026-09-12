import { Request, Response } from 'express';
import prisma from '../../db/prisma';

export class AdminOrderController {
  public async index(req: Request, res: Response) {
    try {
      const orders = await prisma.orders.findMany({
        orderBy: { created_at: 'desc' },
        take: 100
      });

      const mapped = orders.map((o: any) => ({
        id: o.invoice_number,
        internalId: o.id,
        customerName: o.customer_name,
        status: o.status,
        payment: o.payment_status,
        total: Number(o.total_amount),
        date: o.created_at
      }));

      return res.status(200).json({ success: true, data: mapped });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      const orderId = req.params.id as string; // internalId

      const order = await prisma.orders.update({
        where: { id: orderId },
        data: { status, updated_at: new Date() }
      });

      return res.status(200).json({ success: true, data: order });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminOrderController = new AdminOrderController();
