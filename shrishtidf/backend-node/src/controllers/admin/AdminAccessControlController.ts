import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';
import { ACCESS_CONTROL_CATALOG, ALL_MODULE_KEYS } from '../../constants/accessControlModules';

const MODULE_KEY_SET = new Set(ALL_MODULE_KEYS);

function mapPermissionsToCatalog(rows: any[]) {
  const byKey = new Map(rows.map((r: any) => [r.module_key, r]));
  return ACCESS_CONTROL_CATALOG.map((section) => ({
    key: section.key,
    label: section.label,
    modules: section.modules.map((m) => {
      const row = byKey.get(m.key);
      return {
        key: m.key,
        label: m.label,
        canCreate: row?.can_create || false,
        canUpdate: row?.can_update || false,
        canView: row?.can_view || false,
        canPdf: row?.can_pdf || false,
        canExcel: row?.can_excel || false
      };
    })
  }));
}

function summarizePermissions(rows: any[]) {
  const enabled = rows.filter((r: any) => r.can_create || r.can_update || r.can_view || r.can_pdf || r.can_excel);
  return { modulesGranted: enabled.length, totalModules: ALL_MODULE_KEYS.length };
}

export class AdminAccessControlController {
  public async eligibleStaff(req: Request, res: Response) {
    try {
      const excludeCurrent = req.query.excludeAssigned === 'true';
      const staff = await prisma.office_staff.findMany({
        include: { staff_types: true, access_controls: true },
        orderBy: { name: 'asc' }
      });
      const filtered = excludeCurrent ? staff.filter((s: any) => !s.access_controls) : staff;
      return res.status(200).json({
        success: true,
        data: filtered.map((s: any) => ({
          id: s.id,
          name: s.name,
          staffTypeId: s.staff_type_id,
          staffTypeName: s.staff_types?.name,
          hasAccessControl: !!s.access_controls
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async catalog(_req: Request, res: Response) {
    return res.status(200).json({ success: true, data: ACCESS_CONTROL_CATALOG });
  }

  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where: any = {};
      if (query.officeStaffId) where.office_staff_id = query.officeStaffId;

      const rows = await prisma.access_controls.findMany({
        where,
        include: { office_staff: true, staff_types: true, access_control_permissions: true },
        orderBy: { created_at: 'desc' }
      });

      return res.status(200).json({
        success: true,
        data: rows.map((r: any, idx: number) => ({
          srNo: idx + 1,
          id: r.id,
          officeStaffId: r.office_staff_id,
          userTypeName: r.staff_types?.name,
          userName: r.office_staff?.name,
          ...summarizePermissions(r.access_control_permissions),
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportList(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where: any = {};
      if (query.officeStaffId) where.office_staff_id = query.officeStaffId;

      const rows = await prisma.access_controls.findMany({
        where,
        include: { office_staff: true, staff_types: true, access_control_permissions: true },
        orderBy: { created_at: 'desc' }
      });

      const header = ['User Type', 'User', 'Modules Granted', 'Total Modules'];
      const csvRows = rows.map((r: any) => {
        const summary = summarizePermissions(r.access_control_permissions);
        return [r.staff_types?.name || '', r.office_staff?.name || '', summary.modulesGranted, summary.totalModules];
      });
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="user-access-control-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const accessControl = await prisma.access_controls.findUnique({
        where: { id: req.params.id as string },
        include: { office_staff: true, staff_types: true, access_control_permissions: true }
      });
      if (!accessControl) return res.status(404).json({ success: false, message: 'Access control not found' });

      return res.status(200).json({
        success: true,
        data: {
          id: accessControl.id,
          officeStaffId: accessControl.office_staff_id,
          staffTypeId: accessControl.staff_type_id,
          userTypeName: accessControl.staff_types?.name,
          userName: accessControl.office_staff?.name,
          sections: mapPermissionsToCatalog(accessControl.access_control_permissions),
          createdAt: accessControl.created_at,
          updatedAt: accessControl.updated_at
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { staffTypeId, officeStaffId, permissions } = req.body;
      if (!staffTypeId || !officeStaffId) {
        return res.status(422).json({ success: false, message: 'User Type and User are required' });
      }

      const staff = await prisma.office_staff.findUnique({ where: { id: officeStaffId } });
      if (!staff) return res.status(422).json({ success: false, message: 'Selected user does not exist' });
      if (staff.staff_type_id !== staffTypeId) {
        return res.status(422).json({ success: false, message: 'Selected user does not belong to this user type' });
      }

      const existing = await prisma.access_controls.findUnique({ where: { office_staff_id: officeStaffId } });
      if (existing) return res.status(422).json({ success: false, message: 'This user already has an access control — edit it instead' });

      const permMap = new Map((Array.isArray(permissions) ? permissions : []).map((p: any) => [p.moduleKey, p]));
      const now = new Date();

      const created = await prisma.$transaction(async (tx) => {
        const accessControl = await tx.access_controls.create({
          data: { id: crypto.randomUUID(), staff_type_id: staffTypeId, office_staff_id: officeStaffId, created_at: now, updated_at: now }
        });

        await tx.access_control_permissions.createMany({
          data: ALL_MODULE_KEYS.map((key) => {
            const p = permMap.get(key);
            return {
              id: crypto.randomUUID(),
              access_control_id: accessControl.id,
              module_key: key,
              can_create: !!p?.canCreate,
              can_update: !!p?.canUpdate,
              can_view: !!p?.canView,
              can_pdf: !!p?.canPdf,
              can_excel: !!p?.canExcel
            };
          })
        });

        return accessControl;
      });

      return res.status(201).json({ success: true, data: { id: created.id } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const accessControl = await prisma.access_controls.findUnique({ where: { id: req.params.id as string } });
      if (!accessControl) return res.status(404).json({ success: false, message: 'Access control not found' });

      const { permissions } = req.body;
      const validPermissions = (Array.isArray(permissions) ? permissions : []).filter((p: any) => MODULE_KEY_SET.has(p?.moduleKey));
      const permMap = new Map(validPermissions.map((p: any) => [p.moduleKey, p]));
      const now = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.access_control_permissions.deleteMany({ where: { access_control_id: accessControl.id } });
        await tx.access_control_permissions.createMany({
          data: ALL_MODULE_KEYS.map((key) => {
            const p = permMap.get(key);
            return {
              id: crypto.randomUUID(),
              access_control_id: accessControl.id,
              module_key: key,
              can_create: !!p?.canCreate,
              can_update: !!p?.canUpdate,
              can_view: !!p?.canView,
              can_pdf: !!p?.canPdf,
              can_excel: !!p?.canExcel
            };
          })
        });
        await tx.access_controls.update({ where: { id: accessControl.id }, data: { updated_at: now } });
      });

      return res.status(200).json({ success: true, data: { id: accessControl.id } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async destroy(req: Request, res: Response) {
    try {
      const accessControl = await prisma.access_controls.findUnique({ where: { id: req.params.id as string } });
      if (!accessControl) return res.status(404).json({ success: false, message: 'Access control not found' });

      await prisma.access_controls.delete({ where: { id: accessControl.id } });
      return res.status(200).json({ success: true, data: { deleted: true } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminAccessControlController = new AdminAccessControlController();
