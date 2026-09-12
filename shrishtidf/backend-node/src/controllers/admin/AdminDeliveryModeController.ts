import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

export class AdminDeliveryModeController {
  public async index(req: Request, res: Response) {
    try {
      const { name, status } = req.query as Record<string, string>;
      const where: any = {};
      if (name) where.name = { contains: name, mode: 'insensitive' };
      if (status) where.is_active = status === 'active';
      // Public/lite callers (e.g. the customer form's dropdown) only want active modes.
      if (req.query.activeOnly === 'true') where.is_active = true;

      const modes = await prisma.delivery_modes.findMany({ where, orderBy: { sort_order: 'asc' } });
      return res.status(200).json({
        success: true,
        data: modes.map((m: any) => ({ id: m.id, name: m.name, iconUrl: m.icon_url, isActive: m.is_active, displayPriority: m.sort_order }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const mode = await prisma.delivery_modes.findUnique({ where: { id: req.params.id as string } });
      if (!mode) return res.status(404).json({ success: false, message: 'Delivery mode not found' });
      return res.status(200).json({ success: true, data: mode });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { name, iconUrl, status } = req.body;
      if (!name) return res.status(422).json({ success: false, message: 'Name is required' });

      const maxSort = await prisma.delivery_modes.aggregate({ _max: { sort_order: true } });
      const now = new Date();
      const mode = await prisma.delivery_modes.create({
        data: {
          id: crypto.randomUUID(),
          name,
          icon_url: iconUrl || null,
          is_active: status !== false,
          sort_order: (maxSort._max.sort_order ?? -1) + 1,
          created_at: now,
          updated_at: now
        }
      });
      return res.status(201).json({ success: true, data: { mode } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const { name, iconUrl, status, displayPriority } = req.body;
      const data: any = { updated_at: new Date() };
      if (name !== undefined) data.name = name;
      if (iconUrl !== undefined) data.icon_url = iconUrl || null;
      if (status !== undefined) data.is_active = !!status;
      if (displayPriority !== undefined) data.sort_order = Number(displayPriority);

      const mode = await prisma.delivery_modes.update({ where: { id: req.params.id as string }, data });
      return res.status(200).json({ success: true, data: { mode } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminDeliveryModeController = new AdminDeliveryModeController();
