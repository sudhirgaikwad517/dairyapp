import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function mapSubArea(s: any) {
  return {
    id: s.id,
    deliveryAreaId: s.delivery_area_id,
    deliveryArea: s.delivery_areas?.area_name || null,
    name: s.name,
    apartmentCount: s._count?.apartments ?? undefined,
    createdAt: s.created_at
  };
}

export class AdminSubAreaController {
  public async index(req: Request, res: Response) {
    try {
      const { deliveryAreaId, name } = req.query as Record<string, string>;
      const where: any = {};
      if (deliveryAreaId) where.delivery_area_id = deliveryAreaId;
      if (name) where.name = { contains: name, mode: 'insensitive' };

      const subAreas = await prisma.sub_areas.findMany({
        where,
        include: { delivery_areas: true, _count: { select: { apartments: true } } },
        orderBy: { name: 'asc' }
      });
      return res.status(200).json({ success: true, data: subAreas.map(mapSubArea) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportSubAreas(req: Request, res: Response) {
    try {
      const { deliveryAreaId, name } = req.query as Record<string, string>;
      const where: any = {};
      if (deliveryAreaId) where.delivery_area_id = deliveryAreaId;
      if (name) where.name = { contains: name, mode: 'insensitive' };
      const subAreas = await prisma.sub_areas.findMany({ where, include: { delivery_areas: true }, orderBy: { name: 'asc' } });

      const header = ['Delivery Area', 'Sub Area'];
      const csvRows = subAreas.map((s: any) => [s.delivery_areas?.area_name || '', s.name]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sub-areas-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const subArea = await prisma.sub_areas.findUnique({
        where: { id: req.params.id as string },
        include: { delivery_areas: true }
      });
      if (!subArea) return res.status(404).json({ success: false, message: 'Sub area not found' });
      return res.status(200).json({ success: true, data: mapSubArea(subArea) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { deliveryAreaId, name } = req.body;
      if (!deliveryAreaId || !name) {
        return res.status(422).json({ success: false, message: 'Delivery Area and Sub Area name are required' });
      }
      const area = await prisma.delivery_areas.findUnique({ where: { id: deliveryAreaId } });
      if (!area) return res.status(422).json({ success: false, message: 'Selected delivery area does not exist' });

      const now = new Date();
      const subArea = await prisma.sub_areas.create({
        data: { id: crypto.randomUUID(), delivery_area_id: deliveryAreaId, name, created_at: now, updated_at: now },
        include: { delivery_areas: true }
      });
      return res.status(201).json({ success: true, data: mapSubArea(subArea) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.sub_areas.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Sub area not found' });

      const { deliveryAreaId, name } = req.body;
      if (deliveryAreaId !== undefined) {
        const area = await prisma.delivery_areas.findUnique({ where: { id: deliveryAreaId } });
        if (!area) return res.status(422).json({ success: false, message: 'Selected delivery area does not exist' });
      }
      if (name !== undefined && !String(name).trim()) return res.status(422).json({ success: false, message: 'Sub Area name is required' });

      const data: any = { updated_at: new Date() };
      if (deliveryAreaId !== undefined) data.delivery_area_id = deliveryAreaId;
      if (name !== undefined) data.name = name;

      const subArea = await prisma.sub_areas.update({ where: { id }, data, include: { delivery_areas: true } });
      return res.status(200).json({ success: true, data: mapSubArea(subArea) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminSubAreaController = new AdminSubAreaController();
