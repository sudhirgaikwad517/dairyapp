import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function mapRoute(r: any) {
  return {
    id: r.id,
    name: r.name,
    routeCode: r.route_code,
    city: r.city,
    hubId: r.hub_id,
    hub: r.hubs?.name || null,
    driverId: r.driver_id,
    driver: r.delivery_boys?.name || null,
    isActive: r.is_active,
    areas: (r.delivery_areas || []).map((a: any) => ({ id: a.id, areaName: a.area_name })),
    createdAt: r.created_at
  };
}

function buildWhere(query: Record<string, any>) {
  const { name, city, hubId, driverId, status } = query;
  const where: any = {};
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (hubId) where.hub_id = hubId;
  if (driverId) where.driver_id = driverId;
  if (status) where.is_active = status === 'active';
  return where;
}

export class AdminRouteController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where = buildWhere(query);
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));

      const [total, rows] = await Promise.all([
        prisma.delivery_routes.count({ where }),
        prisma.delivery_routes.findMany({
          where,
          include: { hubs: true, delivery_boys: true, delivery_areas: true },
          orderBy: { sort_order: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map(mapRoute), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportRoutes(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const routes = await prisma.delivery_routes.findMany({
        where,
        include: { hubs: true, delivery_boys: true, delivery_areas: true },
        orderBy: { sort_order: 'asc' }
      });

      const header = ['Route Name', 'City', 'Hub', 'Delivery Boy', 'Street / Area', 'Status'];
      const csvRows = routes.map((r: any) => [
        r.name, r.city || '', r.hubs?.name || '', r.delivery_boys?.name || '',
        (r.delivery_areas || []).map((a: any) => a.area_name).join('; '), r.is_active ? 'Active' : 'Not Active'
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="delivery-routes-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const route = await prisma.delivery_routes.findUnique({
        where: { id: req.params.id as string },
        include: { hubs: true, delivery_boys: true, delivery_areas: true }
      });
      if (!route) return res.status(404).json({ success: false, message: 'Delivery route not found' });
      return res.status(200).json({ success: true, data: mapRoute(route) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  private async nextRouteCode() {
    const last = await prisma.delivery_routes.findFirst({ orderBy: { created_at: 'desc' } });
    const lastNum = last ? parseInt(String(last.route_code).replace(/\D/g, ''), 10) || 0 : 0;
    return `RT${String(lastNum + 1).padStart(4, '0')}`;
  }

  public async create(req: Request, res: Response) {
    try {
      const { name, city, hubId, driverId, areaIds, status } = req.body;
      if (!name || !city) {
        return res.status(422).json({ success: false, message: 'Route Name and City are required' });
      }
      if (hubId) {
        const hub = await prisma.hubs.findUnique({ where: { id: hubId } });
        if (!hub) return res.status(422).json({ success: false, message: 'Selected hub does not exist' });
      }
      if (driverId) {
        const driver = await prisma.delivery_boys.findUnique({ where: { id: driverId } });
        if (!driver) return res.status(422).json({ success: false, message: 'Selected delivery boy does not exist' });
      }

      const now = new Date();
      const route = await prisma.delivery_routes.create({
        data: {
          id: crypto.randomUUID(),
          name,
          route_code: await this.nextRouteCode(),
          city,
          hub_id: hubId || null,
          driver_id: driverId || null,
          is_active: status !== false,
          created_at: now,
          updated_at: now
        } as any
      });

      if (Array.isArray(areaIds) && areaIds.length > 0) {
        await prisma.delivery_areas.updateMany({ where: { id: { in: areaIds } }, data: { route_id: route.id } });
      }

      const withAreas = await prisma.delivery_routes.findUnique({
        where: { id: route.id },
        include: { hubs: true, delivery_boys: true, delivery_areas: true }
      });
      return res.status(201).json({ success: true, data: mapRoute(withAreas) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.delivery_routes.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Delivery route not found' });

      const { name, city, hubId, driverId, areaIds, status } = req.body;
      if (hubId !== undefined && hubId) {
        const hub = await prisma.hubs.findUnique({ where: { id: hubId } });
        if (!hub) return res.status(422).json({ success: false, message: 'Selected hub does not exist' });
      }
      if (driverId !== undefined && driverId) {
        const driver = await prisma.delivery_boys.findUnique({ where: { id: driverId } });
        if (!driver) return res.status(422).json({ success: false, message: 'Selected delivery boy does not exist' });
      }
      if (name !== undefined && !String(name).trim()) return res.status(422).json({ success: false, message: 'Route Name is required' });
      if (city !== undefined && !String(city).trim()) return res.status(422).json({ success: false, message: 'City is required' });

      const data: any = { updated_at: new Date() };
      if (name !== undefined) data.name = name;
      if (city !== undefined) data.city = city;
      if (hubId !== undefined) data.hub_id = hubId || null;
      if (driverId !== undefined) data.driver_id = driverId || null;
      if (status !== undefined) data.is_active = !!status;

      await prisma.delivery_routes.update({ where: { id }, data });

      if (Array.isArray(areaIds)) {
        // Release areas no longer assigned to this route, then attach the selected ones.
        await prisma.delivery_areas.updateMany({ where: { route_id: id, id: { notIn: areaIds } }, data: { route_id: null } });
        if (areaIds.length > 0) {
          await prisma.delivery_areas.updateMany({ where: { id: { in: areaIds } }, data: { route_id: id } });
        }
      }

      const route = await prisma.delivery_routes.findUnique({
        where: { id },
        include: { hubs: true, delivery_boys: true, delivery_areas: true }
      });
      return res.status(200).json({ success: true, data: mapRoute(route) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminRouteController = new AdminRouteController();
