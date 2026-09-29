import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import bcrypt from 'bcryptjs';
import { signAdminToken, signStaffToken, revokeToken } from '../../middleware/adminAuth';
import { ACCESS_CONTROL_CATALOG, ALL_MODULE_KEYS } from '../../constants/accessControlModules';

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

      const token = signAdminToken(admin.id, admin.email);
      return res.status(200).json({ success: true, token, data: { type: 'admin', name: admin.name, email: admin.email } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  public async staffLogin(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
      }

      const staff = await prisma.office_staff.findUnique({ where: { username }, include: { staff_types: true } });
      if (!staff || !staff.is_active) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, staff.password);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = signStaffToken(staff.id, staff.staff_type_id, staff.name);
      return res.status(200).json({
        success: true,
        token,
        data: { type: 'staff', name: staff.name, staffTypeName: staff.staff_types?.name }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  public async me(req: Request, res: Response) {
    try {
      const user = req.authUser;
      if (!user) return res.status(401).json({ success: false, message: 'Not logged in' });

      if (user.type === 'admin') {
        const admin = await prisma.admin_users.findUnique({ where: { id: user.id } });
        return res.status(200).json({
          success: true,
          data: { type: 'admin', name: admin?.name, email: admin?.email, permissions: null }
        });
      }

      const accessControl = await prisma.access_controls.findUnique({
        where: { office_staff_id: user.officeStaffId },
        include: { access_control_permissions: true, staff_types: true }
      });

      const byKey = new Map((accessControl?.access_control_permissions || []).map((p: any) => [p.module_key, p]));
      const permissions: Record<string, any> = {};
      for (const key of ALL_MODULE_KEYS) {
        const row = byKey.get(key);
        permissions[key] = {
          canCreate: row?.can_create || false,
          canUpdate: row?.can_update || false,
          canView: row?.can_view || false,
          canPdf: row?.can_pdf || false,
          canExcel: row?.can_excel || false
        };
      }

      return res.status(200).json({
        success: true,
        data: {
          type: 'staff',
          name: user.name,
          staffTypeName: accessControl?.staff_types?.name,
          catalog: ACCESS_CONTROL_CATALOG,
          permissions
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      const user = req.authUser as any;
      if (user?.jti) await revokeToken(user.jti);
      return res.status(200).json({ success: true, data: { loggedOut: true } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  public async changePassword(req: Request, res: Response) {
    try {
      const user = req.authUser;
      if (!user) return res.status(401).json({ success: false, message: 'Not logged in' });

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(422).json({ success: false, message: 'Current password and new password are required' });
      }
      if (String(newPassword).length < 6) {
        return res.status(422).json({ success: false, message: 'New password must be at least 6 characters' });
      }

      if (user.type === 'admin') {
        const admin = await prisma.admin_users.findUnique({ where: { id: user.id } });
        if (!admin) return res.status(404).json({ success: false, message: 'Account not found' });

        const valid = await bcrypt.compare(currentPassword, admin.password);
        if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.admin_users.update({ where: { id: admin.id }, data: { password: hashed } });
        return res.status(200).json({ success: true, data: { changed: true } });
      }

      const staff = await prisma.office_staff.findUnique({ where: { id: user.officeStaffId } });
      if (!staff) return res.status(404).json({ success: false, message: 'Account not found' });

      const valid = await bcrypt.compare(currentPassword, staff.password);
      if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.office_staff.update({ where: { id: staff.id }, data: { password: hashed, updated_at: new Date() } });
      return res.status(200).json({ success: true, data: { changed: true } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

export const adminAuthController = new AdminAuthController();
