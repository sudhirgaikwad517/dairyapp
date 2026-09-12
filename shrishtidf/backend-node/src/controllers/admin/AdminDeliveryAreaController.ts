import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function mapArea(a: any) {
  return {
    id: a.id,
    state: a.state,
    city: a.city,
    areaName: a.area_name,
    areaPin: a.area_pin,
    isServiceable: a.is_serviceable,
    routeId: a.route_id,
    route: a.delivery_routes?.name || null,
    hub: a.delivery_routes?.hubs?.name || null,
    subAreaCount: a._count?.sub_areas ?? undefined,
    createdAt: a.created_at
  };
}

function buildWhere(query: Record<string, any>) {
  const { state, city, areaName, hubId, service, unassignedFor } = query;
  const where: any = {};
  if (state) where.state = { contains: state, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (areaName) where.area_name = { contains: areaName, mode: 'insensitive' };
  if (service) where.is_serviceable = service === 'available';
  if (hubId) where.delivery_routes = { hub_id: hubId };
  // Used by the Route dual-listbox: areas with no route yet, plus whichever are already on this route (when editing).
  // A non-UUID value (e.g. the frontend's "__new__" sentinel for an unsaved route) just means "no route to keep".
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unassignedFor || '');
  if (unassignedFor && isUuid) where.OR = [{ route_id: null }, { route_id: unassignedFor }];
  else if (unassignedFor) where.route_id = null;
  return where;
}

export class AdminDeliveryAreaController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where = buildWhere(query);

      if (!query.page) {
        const areas = await prisma.delivery_areas.findMany({
          where,
          include: { delivery_routes: { include: { hubs: true } } },
          orderBy: { area_name: 'asc' }
        });
        return res.status(200).json({ success: true, data: areas.map(mapArea) });
      }

      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));

      const [total, rows] = await Promise.all([
        prisma.delivery_areas.count({ where }),
        prisma.delivery_areas.findMany({
          where,
          include: { delivery_routes: { include: { hubs: true } }, _count: { select: { sub_areas: true } } },
          orderBy: { area_name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map(mapArea), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportAreas(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const areas = await prisma.delivery_areas.findMany({
        where,
        include: { delivery_routes: { include: { hubs: true } } },
        orderBy: { area_name: 'asc' }
      });

      const header = ['State', 'City', 'Area Name', 'Area Pin', 'Hub', 'Route', 'Service Availability'];
      const csvRows = areas.map((a: any) => [
        a.state || '', a.city || '', a.area_name, a.area_pin || '', a.delivery_routes?.hubs?.name || '',
        a.delivery_routes?.name || '', a.is_serviceable ? 'Delivery Available' : 'Not Available'
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="delivery-areas-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const area = await prisma.delivery_areas.findUnique({
        where: { id: req.params.id as string },
        include: { delivery_routes: { include: { hubs: true } } }
      });
      if (!area) return res.status(404).json({ success: false, message: 'Delivery area not found' });
      return res.status(200).json({ success: true, data: mapArea(area) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { state, city, areaName, areaPin, isServiceable } = req.body;
      if (!city || !areaName) {
        return res.status(422).json({ success: false, message: 'City and Area Name are required' });
      }
      const now = new Date();
      const area = await prisma.delivery_areas.create({
        data: {
          id: crypto.randomUUID(),
          state: state || null,
          city,
          area_name: areaName,
          area_pin: areaPin || null,
          is_serviceable: isServiceable !== false,
          created_at: now,
          updated_at: now
        }
      });
      return res.status(201).json({ success: true, data: mapArea(area) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.delivery_areas.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Delivery area not found' });

      const { state, city, areaName, areaPin, isServiceable } = req.body;
      if (city !== undefined && !String(city).trim()) return res.status(422).json({ success: false, message: 'City is required' });
      if (areaName !== undefined && !String(areaName).trim()) return res.status(422).json({ success: false, message: 'Area Name is required' });

      const data: any = { updated_at: new Date() };
      if (state !== undefined) data.state = state || null;
      if (city !== undefined) data.city = city;
      if (areaName !== undefined) data.area_name = areaName;
      if (areaPin !== undefined) data.area_pin = areaPin || null;
      if (isServiceable !== undefined) data.is_serviceable = !!isServiceable;

      const area = await prisma.delivery_areas.update({
        where: { id },
        data,
        include: { delivery_routes: { include: { hubs: true } } }
      });
      return res.status(200).json({ success: true, data: mapArea(area) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminDeliveryAreaController = new AdminDeliveryAreaController();
