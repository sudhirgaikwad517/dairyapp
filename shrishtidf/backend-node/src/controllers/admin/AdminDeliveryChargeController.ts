import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

async function findOverlap(from: number, to: number, excludeId?: string) {
  return prisma.delivery_charge_tiers.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      charge_from: { lte: to },
      charge_to: { gte: from }
    }
  });
}

export class AdminDeliveryChargeController {
  public async index(req: Request, res: Response) {
    try {
      const tiers = await prisma.delivery_charge_tiers.findMany({ orderBy: { charge_from: 'asc' } });
      return res.status(200).json({
        success: true,
        data: tiers.map((t: any) => ({ id: t.id, chargeFrom: t.charge_from, chargeTo: t.charge_to, charge: t.charge }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const tier = await prisma.delivery_charge_tiers.findUnique({ where: { id: req.params.id as string } });
      if (!tier) return res.status(404).json({ success: false, message: 'Delivery charge tier not found' });
      return res.status(200).json({ success: true, data: tier });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { chargeFrom, chargeTo, charge } = req.body;
      if (chargeFrom === undefined || chargeTo === undefined || charge === undefined) {
        return res.status(422).json({ success: false, message: 'Charge From, Charge To and Charge are required' });
      }
      if (Number(chargeFrom) >= Number(chargeTo)) {
        return res.status(422).json({ success: false, message: 'Charge From must be less than Charge To' });
      }

      const overlap = await findOverlap(Number(chargeFrom), Number(chargeTo));
      if (overlap) {
        return res.status(422).json({
          success: false,
          message: `This range overlaps with an existing tier (₹${overlap.charge_from}–₹${overlap.charge_to})`
        });
      }

      const now = new Date();
      const tier = await prisma.delivery_charge_tiers.create({
        data: {
          id: crypto.randomUUID(),
          charge_from: Number(chargeFrom),
          charge_to: Number(chargeTo),
          charge: Number(charge),
          created_at: now,
          updated_at: now
        }
      });
      return res.status(201).json({ success: true, data: { tier } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.delivery_charge_tiers.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Delivery charge tier not found' });

      const { chargeFrom, chargeTo, charge } = req.body;
      const nextFrom = chargeFrom !== undefined ? Number(chargeFrom) : existing.charge_from;
      const nextTo = chargeTo !== undefined ? Number(chargeTo) : existing.charge_to;

      if (nextFrom >= nextTo) {
        return res.status(422).json({ success: false, message: 'Charge From must be less than Charge To' });
      }

      const overlap = await findOverlap(nextFrom, nextTo, id);
      if (overlap) {
        return res.status(422).json({
          success: false,
          message: `This range overlaps with an existing tier (₹${overlap.charge_from}–₹${overlap.charge_to})`
        });
      }

      const data: any = { updated_at: new Date(), charge_from: nextFrom, charge_to: nextTo };
      if (charge !== undefined) data.charge = Number(charge);

      const tier = await prisma.delivery_charge_tiers.update({ where: { id }, data });
      return res.status(200).json({ success: true, data: { tier } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async remove(req: Request, res: Response) {
    try {
      await prisma.delivery_charge_tiers.delete({ where: { id: req.params.id as string } });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminDeliveryChargeController = new AdminDeliveryChargeController();
