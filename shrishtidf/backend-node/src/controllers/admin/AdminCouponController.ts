import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function mapCoupon(c: any) {
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description,
    discountType: c.discount_type,
    discountValue: c.discount_value,
    minOrderAmount: c.min_order_amount,
    maxDiscountAmount: c.max_discount_amount,
    validFrom: c.valid_from,
    validTo: c.valid_to,
    usageLimitPerCustomer: c.usage_limit_per_customer,
    isActive: c.is_active,
    createdAt: c.created_at
  };
}

function buildWhere(query: Record<string, any>) {
  const { code, status } = query;
  const where: any = {};
  if (code) where.code = { contains: code, mode: 'insensitive' };
  if (status) where.is_active = status === 'active';
  return where;
}

export class AdminCouponController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildWhere(query);

      const [total, rows] = await Promise.all([
        prisma.coupons.count({ where }),
        prisma.coupons.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * pageSize, take: pageSize })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map(mapCoupon), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const coupon = await prisma.coupons.findUnique({ where: { id: req.params.id as string } });
      if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
      return res.status(200).json({ success: true, data: mapCoupon(coupon) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { code, title, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, validFrom, validTo, usageLimitPerCustomer, status } = req.body;
      if (!code || !title) return res.status(422).json({ success: false, message: 'Code and title are required' });
      if (discountType && !['percent', 'flat'].includes(discountType)) {
        return res.status(422).json({ success: false, message: 'Discount type must be percent or flat' });
      }

      const existing = await prisma.coupons.findUnique({ where: { code: String(code).toUpperCase() } });
      if (existing) return res.status(422).json({ success: false, message: 'A coupon with this code already exists' });

      const now = new Date();
      const created = await prisma.coupons.create({
        data: {
          id: crypto.randomUUID(),
          code: String(code).toUpperCase(),
          title,
          description: description || null,
          discount_type: discountType || 'percent',
          discount_value: Number(discountValue || 0),
          min_order_amount: Number(minOrderAmount || 0),
          max_discount_amount: maxDiscountAmount !== undefined && maxDiscountAmount !== null && maxDiscountAmount !== '' ? Number(maxDiscountAmount) : null,
          valid_from: validFrom ? new Date(validFrom) : null,
          valid_to: validTo ? new Date(validTo) : null,
          usage_limit_per_customer: Number(usageLimitPerCustomer || 1),
          is_active: status !== false,
          created_at: now,
          updated_at: now
        }
      });
      return res.status(201).json({ success: true, data: mapCoupon(created) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const { title, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, validFrom, validTo, usageLimitPerCustomer, status } = req.body;
      const data: any = { updated_at: new Date() };
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description || null;
      if (discountType !== undefined) {
        if (!['percent', 'flat'].includes(discountType)) {
          return res.status(422).json({ success: false, message: 'Discount type must be percent or flat' });
        }
        data.discount_type = discountType;
      }
      if (discountValue !== undefined) data.discount_value = Number(discountValue);
      if (minOrderAmount !== undefined) data.min_order_amount = Number(minOrderAmount);
      if (maxDiscountAmount !== undefined) data.max_discount_amount = maxDiscountAmount === null || maxDiscountAmount === '' ? null : Number(maxDiscountAmount);
      if (validFrom !== undefined) data.valid_from = validFrom ? new Date(validFrom) : null;
      if (validTo !== undefined) data.valid_to = validTo ? new Date(validTo) : null;
      if (usageLimitPerCustomer !== undefined) data.usage_limit_per_customer = Number(usageLimitPerCustomer);
      if (status !== undefined) data.is_active = !!status;

      const updated = await prisma.coupons.update({ where: { id: req.params.id as string }, data });
      return res.status(200).json({ success: true, data: mapCoupon(updated) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async destroy(req: Request, res: Response) {
    try {
      await prisma.coupons.delete({ where: { id: req.params.id as string } });
      return res.status(200).json({ success: true, data: {} });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminCouponController = new AdminCouponController();
