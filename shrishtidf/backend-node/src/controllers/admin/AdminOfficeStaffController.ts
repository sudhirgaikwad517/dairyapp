import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Never include `password` here — office staff credentials must never round-trip
// through any API response, not even hashed.
function mapStaff(s: any) {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    contactNo: s.contact_no,
    address: s.address,
    username: s.username,
    photoUrl: s.photo_url,
    aadharUrl: s.aadhar_url,
    isActive: s.is_active,
    staffTypeId: s.staff_type_id,
    staffType: s.staff_types?.name || null,
    createdAt: s.created_at
  };
}

function buildWhere(query: Record<string, any>) {
  const { name, contactNo, email, address, staffTypeId, status } = query;
  const where: any = {};
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (contactNo) where.contact_no = { contains: contactNo };
  if (email) where.email = { contains: email, mode: 'insensitive' };
  if (address) where.address = { contains: address, mode: 'insensitive' };
  if (staffTypeId) where.staff_type_id = staffTypeId;
  if (status) where.is_active = status === 'active';
  return where;
}

export class AdminOfficeStaffController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildWhere(query);

      const [total, rows] = await Promise.all([
        prisma.office_staff.count({ where }),
        prisma.office_staff.findMany({
          where,
          include: { staff_types: true },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map(mapStaff), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportStaff(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const rows = await prisma.office_staff.findMany({ where, include: { staff_types: true }, orderBy: { created_at: 'desc' } });

      const header = ['Name', 'Email', 'Contact No', 'Address', 'Staff Type', 'Username', 'Status'];
      const csvRows = rows.map((s: any) => [
        s.name, s.email, s.contact_no, s.address || '', s.staff_types?.name || '', s.username, s.is_active ? 'Activated' : 'Deactivated'
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="office-staff-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const staff = await prisma.office_staff.findUnique({
        where: { id: req.params.id as string },
        include: { staff_types: true }
      });
      if (!staff) return res.status(404).json({ success: false, message: 'Office staff not found' });
      return res.status(200).json({ success: true, data: mapStaff(staff) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const b = req.body;
      if (!b.name || !b.email || !b.contactNo || !b.staffTypeId || !b.username || !b.password) {
        return res.status(422).json({ success: false, message: 'Name, email, contact number, staff type, username and password are required' });
      }

      const [emailTaken, usernameTaken, staffType] = await Promise.all([
        prisma.office_staff.findUnique({ where: { email: b.email } }),
        prisma.office_staff.findUnique({ where: { username: b.username } }),
        prisma.staff_types.findUnique({ where: { id: b.staffTypeId } })
      ]);
      if (emailTaken) return res.status(422).json({ success: false, message: 'This email is already in use' });
      if (usernameTaken) return res.status(422).json({ success: false, message: 'This username is already in use' });
      if (!staffType) return res.status(422).json({ success: false, message: 'Selected staff type does not exist' });

      const hashedPassword = await bcrypt.hash(b.password, 10);
      const now = new Date();

      const staff = await prisma.office_staff.create({
        data: {
          id: crypto.randomUUID(),
          staff_type_id: b.staffTypeId,
          name: b.name,
          email: b.email,
          contact_no: b.contactNo,
          address: b.address || null,
          username: b.username,
          password: hashedPassword,
          photo_url: b.photoUrl || null,
          aadhar_url: b.aadharUrl || null,
          is_active: b.status !== false,
          created_at: now,
          updated_at: now
        },
        include: { staff_types: true }
      });

      return res.status(201).json({ success: true, data: mapStaff(staff) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const b = req.body;

      const existing = await prisma.office_staff.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Office staff not found' });

      if (b.email && b.email !== existing.email) {
        const taken = await prisma.office_staff.findUnique({ where: { email: b.email } });
        if (taken) return res.status(422).json({ success: false, message: 'This email is already in use' });
      }
      if (b.username && b.username !== existing.username) {
        const taken = await prisma.office_staff.findUnique({ where: { username: b.username } });
        if (taken) return res.status(422).json({ success: false, message: 'This username is already in use' });
      }
      if (b.staffTypeId && b.staffTypeId !== existing.staff_type_id) {
        const staffType = await prisma.staff_types.findUnique({ where: { id: b.staffTypeId } });
        if (!staffType) return res.status(422).json({ success: false, message: 'Selected staff type does not exist' });
      }

      const data: any = { updated_at: new Date() };
      if (b.name !== undefined) data.name = b.name;
      if (b.email !== undefined) data.email = b.email;
      if (b.contactNo !== undefined) data.contact_no = b.contactNo;
      if (b.address !== undefined) data.address = b.address || null;
      if (b.staffTypeId !== undefined) data.staff_type_id = b.staffTypeId;
      if (b.username !== undefined) data.username = b.username;
      if (b.photoUrl !== undefined) data.photo_url = b.photoUrl || null;
      if (b.aadharUrl !== undefined) data.aadhar_url = b.aadharUrl || null;
      if (b.status !== undefined) data.is_active = !!b.status;
      // Password is optional on edit — only touched when the admin actually types a new one.
      if (b.password) data.password = await bcrypt.hash(b.password, 10);

      const staff = await prisma.office_staff.update({ where: { id }, data, include: { staff_types: true } });
      return res.status(200).json({ success: true, data: mapStaff(staff) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminOfficeStaffController = new AdminOfficeStaffController();
