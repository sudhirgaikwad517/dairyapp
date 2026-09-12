import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Never include `password` here — delivery boy login credentials must never round-trip through any API response.
function mapDeliveryBoy(d: any) {
  return {
    id: d.id,
    name: d.name,
    firstName: d.first_name || d.name,
    middleName: d.middle_name || '',
    lastName: d.last_name || '',
    phone: d.phone,
    dateOfBirth: d.date_of_birth,
    address: d.address,
    city: d.city,
    hubId: d.hub_id,
    hub: d.hubs?.name || null,
    photoUrl: d.photo_url,
    aadharUrl: d.aadhar_url,
    username: d.username,
    isActive: d.is_active,
    createdAt: d.created_at
  };
}

function buildWhere(query: Record<string, any>) {
  const { name, phone, address, city, hubId, status, dob } = query;
  const where: any = {};
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (phone) where.phone = { contains: phone };
  if (address) where.address = { contains: address, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (hubId) where.hub_id = hubId;
  if (status) where.is_active = status === 'active';
  if (dob) where.date_of_birth = new Date(dob);
  return where;
}

export class AdminDeliveryBoyController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where = buildWhere(query);

      if (!query.page) {
        const boys = await prisma.delivery_boys.findMany({ where: { is_active: true, ...where }, orderBy: { name: 'asc' } });
        return res.status(200).json({ success: true, data: boys.map((b: any) => ({ id: b.id, name: b.name, phone: b.phone })) });
      }

      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));

      const [total, rows] = await Promise.all([
        prisma.delivery_boys.count({ where }),
        prisma.delivery_boys.findMany({
          where,
          include: { hubs: true },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map(mapDeliveryBoy), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportDeliveryBoys(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const boys = await prisma.delivery_boys.findMany({ where, include: { hubs: true }, orderBy: { name: 'asc' } });

      const header = ['Name', 'Date of Birth', 'Mobile', 'Address', 'City', 'Hub', 'Username', 'Status'];
      const csvRows = boys.map((b: any) => [
        b.name, b.date_of_birth ? new Date(b.date_of_birth).toISOString().slice(0, 10) : '', b.phone || '',
        b.address || '', b.city || '', b.hubs?.name || '', b.username || '', b.is_active ? 'Activated' : 'Deactivated'
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="delivery-boys-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const boy = await prisma.delivery_boys.findUnique({ where: { id: req.params.id as string }, include: { hubs: true } });
      if (!boy) return res.status(404).json({ success: false, message: 'Delivery boy not found' });
      return res.status(200).json({ success: true, data: mapDeliveryBoy(boy) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const b = req.body;
      if (!b.firstName || !b.lastName || !b.phone || !b.address || !b.city || !b.username || !b.password) {
        return res.status(422).json({ success: false, message: 'First name, last name, mobile, address, city, username and password are required' });
      }

      const [phoneTaken, usernameTaken, hub] = await Promise.all([
        prisma.delivery_boys.findFirst({ where: { phone: b.phone } }),
        prisma.delivery_boys.findUnique({ where: { username: b.username } }),
        b.hubId ? prisma.hubs.findUnique({ where: { id: b.hubId } }) : Promise.resolve(true)
      ]);
      if (phoneTaken) return res.status(422).json({ success: false, message: 'This mobile number is already in use' });
      if (usernameTaken) return res.status(422).json({ success: false, message: 'This username is already in use' });
      if (!hub) return res.status(422).json({ success: false, message: 'Selected hub does not exist' });

      const fullName = [b.firstName, b.middleName, b.lastName].filter(Boolean).join(' ');
      const hashedPassword = await bcrypt.hash(b.password, 10);
      const now = new Date();

      const boy = await prisma.delivery_boys.create({
        data: {
          id: crypto.randomUUID(),
          name: fullName,
          first_name: b.firstName,
          middle_name: b.middleName || null,
          last_name: b.lastName,
          phone: b.phone,
          date_of_birth: b.dateOfBirth ? new Date(b.dateOfBirth) : null,
          address: b.address,
          city: b.city,
          hub_id: b.hubId || null,
          photo_url: b.photoUrl || null,
          aadhar_url: b.aadharUrl || null,
          username: b.username,
          password: hashedPassword,
          is_active: b.status !== false,
          created_at: now,
          updated_at: now
        } as any,
        include: { hubs: true }
      });
      return res.status(201).json({ success: true, data: mapDeliveryBoy(boy) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const existing = await prisma.delivery_boys.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Delivery boy not found' });

      const b = req.body;
      if (b.phone && b.phone !== existing.phone) {
        const taken = await prisma.delivery_boys.findFirst({ where: { phone: b.phone } });
        if (taken) return res.status(422).json({ success: false, message: 'This mobile number is already in use' });
      }
      if (b.username && b.username !== existing.username) {
        const taken = await prisma.delivery_boys.findUnique({ where: { username: b.username } });
        if (taken) return res.status(422).json({ success: false, message: 'This username is already in use' });
      }
      if (b.hubId) {
        const hub = await prisma.hubs.findUnique({ where: { id: b.hubId } });
        if (!hub) return res.status(422).json({ success: false, message: 'Selected hub does not exist' });
      }

      const data: any = { updated_at: new Date() };
      if (b.firstName !== undefined) data.first_name = b.firstName;
      if (b.middleName !== undefined) data.middle_name = b.middleName || null;
      if (b.lastName !== undefined) data.last_name = b.lastName;
      if (b.firstName !== undefined || b.middleName !== undefined || b.lastName !== undefined) {
        data.name = [
          b.firstName !== undefined ? b.firstName : existing.first_name,
          b.middleName !== undefined ? b.middleName : existing.middle_name,
          b.lastName !== undefined ? b.lastName : existing.last_name
        ].filter(Boolean).join(' ') || existing.name;
      }
      if (b.phone !== undefined) data.phone = b.phone;
      if (b.dateOfBirth !== undefined) data.date_of_birth = b.dateOfBirth ? new Date(b.dateOfBirth) : null;
      if (b.address !== undefined) data.address = b.address;
      if (b.city !== undefined) data.city = b.city;
      if (b.hubId !== undefined) data.hub_id = b.hubId || null;
      if (b.photoUrl !== undefined) data.photo_url = b.photoUrl || null;
      if (b.aadharUrl !== undefined) data.aadhar_url = b.aadharUrl || null;
      if (b.username !== undefined) data.username = b.username;
      if (b.status !== undefined) data.is_active = !!b.status;
      if (b.password) data.password = await bcrypt.hash(b.password, 10);

      const boy = await prisma.delivery_boys.update({ where: { id }, data, include: { hubs: true } });
      return res.status(200).json({ success: true, data: mapDeliveryBoy(boy) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminDeliveryBoyController = new AdminDeliveryBoyController();
