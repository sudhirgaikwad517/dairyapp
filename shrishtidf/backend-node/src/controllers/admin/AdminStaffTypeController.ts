import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

export class AdminStaffTypeController {
  public async index(req: Request, res: Response) {
    try {
      const { name, status, activeOnly } = req.query as Record<string, string>;
      const where: any = {};
      if (name) where.name = { contains: name, mode: 'insensitive' };
      if (status) where.is_active = status === 'active';
      if (activeOnly === 'true') where.is_active = true;

      const staffTypes = await prisma.staff_types.findMany({ where, orderBy: { name: 'asc' } });
      return res.status(200).json({
        success: true,
        data: staffTypes.map((s: any) => ({ id: s.id, name: s.name, isActive: s.is_active }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const staffType = await prisma.staff_types.findUnique({ where: { id: req.params.id as string } });
      if (!staffType) return res.status(404).json({ success: false, message: 'Staff type not found' });
      return res.status(200).json({ success: true, data: staffType });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { name, status } = req.body;
      if (!name) return res.status(422).json({ success: false, message: 'Name is required' });

      const now = new Date();
      const staffType = await prisma.staff_types.create({
        data: { id: crypto.randomUUID(), name, is_active: status !== false, created_at: now, updated_at: now }
      });
      return res.status(201).json({ success: true, data: { staffType } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const { name, status } = req.body;
      const data: any = { updated_at: new Date() };
      if (name !== undefined) data.name = name;
      if (status !== undefined) data.is_active = !!status;

      const staffType = await prisma.staff_types.update({
        where: { id: req.params.id as string },
        data
      });
      return res.status(200).json({ success: true, data: { staffType } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminStaffTypeController = new AdminStaffTypeController();
