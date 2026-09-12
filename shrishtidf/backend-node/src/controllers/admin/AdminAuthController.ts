import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AdminAuthController {
  public async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required' });
      }

      const admin = await prisma.admin_users.findUnique({ where: { email } });
      if (!admin) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const secret = process.env.JWT_SECRET || 'fallback_secret';
      const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, secret, {
        expiresIn: '7d'
      });

      return res.status(200).json({ success: true, token, data: { name: admin.name, email: admin.email } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

export const adminAuthController = new AdminAuthController();
