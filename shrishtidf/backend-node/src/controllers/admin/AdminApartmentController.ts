import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function mapApartment(a: any) {
  return {
    id: a.id,
    subAreaId: a.sub_area_id,
    subArea: a.sub_areas?.name || null,
    deliveryArea: a.sub_areas?.delivery_areas?.area_name || null,
    name: a.name,
    createdAt: a.created_at
  };
}

function buildWhere(query: Record<string, any>) {
  const { deliveryAreaId, subAreaId, name } = query;
  const where: any = {};
  if (subAreaId) where.sub_area_id = subAreaId;
  if (deliveryAreaId) where.sub_areas = { delivery_area_id: deliveryAreaId };
  if (name) where.name = { contains: name, mode: 'insensitive' };
  return where;
}

export class AdminApartmentController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where = buildWhere(query);
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));

      const [total, rows] = await Promise.all([
        prisma.apartments.count({ where }),
        prisma.apartments.findMany({
          where,
          include: { sub_areas: { include: { delivery_areas: true } } },
          orderBy: { name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map(mapApartment), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportApartments(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const apartments = await prisma.apartments.findMany({
        where,
        include: { sub_areas: { include: { delivery_areas: true } } },
        orderBy: { name: 'asc' }
      });

      const header = ['Apartment', 'Sub Area', 'Delivery Area'];
      const csvRows = apartments.map((a: any) => [a.name, a.sub_areas?.name || '', a.sub_areas?.delivery_areas?.area_name || '']);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="apartments-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const apartment = await prisma.apartments.findUnique({
        where: { id: req.params.id as string },
        include: { sub_areas: { include: { delivery_areas: true } } }
      });
      if (!apartment) return res.status(404).json({ success: false, message: 'Apartment not found' });
      return res.status(200).json({ success: true, data: mapApartment(apartment) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { subAreaId, name } = req.body;
      if (!subAreaId || !name) {
        return res.status(422).json({ success: false, message: 'Sub Area and Apartment name are required' });
      }
      const subArea = await prisma.sub_areas.findUnique({ where: { id: subAreaId } });
      if (!subArea) return res.status(422).json({ success: false, message: 'Selected sub area does not exist' });

      const now = new Date();
      const apartment = await prisma.apartments.create({
        data: { id: crypto.randomUUID(), sub_area_id: subAreaId, name, created_at: now, updated_at: now },
        include: { sub_areas: { include: { delivery_areas: true } } }
      });
      return res.status(201).json({ success: true, data: mapApartment(apartment) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.apartments.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Apartment not found' });

      const { subAreaId, name } = req.body;
      if (subAreaId !== undefined) {
        const subArea = await prisma.sub_areas.findUnique({ where: { id: subAreaId } });
        if (!subArea) return res.status(422).json({ success: false, message: 'Selected sub area does not exist' });
      }
      if (name !== undefined && !String(name).trim()) return res.status(422).json({ success: false, message: 'Apartment name is required' });

      const data: any = { updated_at: new Date() };
      if (subAreaId !== undefined) data.sub_area_id = subAreaId;
      if (name !== undefined) data.name = name;

      const apartment = await prisma.apartments.update({
        where: { id },
        data,
        include: { sub_areas: { include: { delivery_areas: true } } }
      });
      return res.status(200).json({ success: true, data: mapApartment(apartment) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminApartmentController = new AdminApartmentController();
