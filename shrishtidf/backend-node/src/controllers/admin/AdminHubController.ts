import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function mapHub(h: any) {
  return { id: h.id, name: h.name, city: h.city, isActive: h.is_active, createdAt: h.created_at };
}

export class AdminHubController {
  public async index(req: Request, res: Response) {
    try {
      const { name, city, status } = req.query as Record<string, string>;
      const where: any = {};
      if (name) where.name = { contains: name, mode: 'insensitive' };
      if (city) where.city = { contains: city, mode: 'insensitive' };
      // Dropdown callers (Customer form/filters) pass no `status` and rely on active-only results.
      // The Hubs admin page passes status=all/active/inactive explicitly to see everything.
      if (status === 'active') where.is_active = true;
      else if (status === 'inactive') where.is_active = false;
      else if (!status) where.is_active = true;

      const hubs = await prisma.hubs.findMany({ where, orderBy: { name: 'asc' } });
      return res.status(200).json({ success: true, data: hubs.map(mapHub) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const hub = await prisma.hubs.findUnique({ where: { id: req.params.id as string } });
      if (!hub) return res.status(404).json({ success: false, message: 'Hub not found' });
      return res.status(200).json({ success: true, data: mapHub(hub) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { name, city, status } = req.body;
      if (!name) {
        return res.status(422).json({ success: false, message: 'Hub name is required' });
      }
      const now = new Date();
      const hub = await prisma.hubs.create({
        data: {
          id: crypto.randomUUID(),
          name,
          city: city || null,
          is_active: status !== false,
          created_at: now,
          updated_at: now
        }
      });
      return res.status(201).json({ success: true, data: mapHub(hub) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.hubs.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Hub not found' });

      const { name, city, status } = req.body;
      if (name !== undefined && !String(name).trim()) {
        return res.status(422).json({ success: false, message: 'Hub name is required' });
      }

      const data: any = { updated_at: new Date() };
      if (name !== undefined) data.name = name;
      if (city !== undefined) data.city = city || null;
      if (status !== undefined) data.is_active = !!status;

      const hub = await prisma.hubs.update({ where: { id }, data });
      return res.status(200).json({ success: true, data: mapHub(hub) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminHubController = new AdminHubController();
