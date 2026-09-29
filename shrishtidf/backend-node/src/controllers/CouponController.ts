import { Request, Response } from 'express';
import prisma from '../db/prisma';

export class CouponController {
  // "All Coupons" screen — active coupons whose validity window covers today.
  public async index(req: Request, res: Response) {
    try {
      const today = new Date();
      const coupons = await prisma.coupons.findMany({
        where: {
          is_active: true,
          AND: [
            { OR: [{ valid_from: null }, { valid_from: { lte: today } }] },
            { OR: [{ valid_to: null }, { valid_to: { gte: today } }] }
          ]
        },
        orderBy: { created_at: 'desc' }
      });

      return res.status(200).json({
        success: true,
        data: coupons.map((c: any) => ({
          id: c.id,
          code: c.code,
          title: c.title,
          description: c.description,
          discountType: c.discount_type,
          discountValue: c.discount_value,
          minOrderAmount: c.min_order_amount,
          maxDiscountAmount: c.max_discount_amount,
          validTo: c.valid_to
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const couponController = new CouponController();
