import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function buildWhere(query: Record<string, any>) {
  const { name, status } = query;
  const where: any = {};
  if (name) where.label = { contains: name, mode: 'insensitive' };
  if (status) where.is_active = status === 'active';
  return where;
}

export class AdminCategoryController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildWhere(query);

      const [total, categories] = await Promise.all([
        prisma.product_categories.count({ where }),
        prisma.product_categories.findMany({
          where,
          orderBy: { sort_order: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const mapped = categories.map((c: any) => ({
        id: c.id,
        label: c.label,
        image: c.image_url,
        description: c.description,
        isActive: c.is_active,
        displayPriority: c.sort_order
      }));

      return res.status(200).json({
        success: true,
        data: { rows: mapped, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportCategories(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const categories = await prisma.product_categories.findMany({ where, orderBy: { sort_order: 'asc' } });

      const header = ['Category Name', 'Display Priority', 'Status'];
      const csvRows = categories.map((c: any) => [c.label, c.sort_order, c.is_active ? 'Activated' : 'Deactivated']);
      const csv = [header, ...csvRows]
        .map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="categories-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const category = await prisma.product_categories.findUnique({ where: { id } });
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      return res.status(200).json({ success: true, data: category });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const b = req.body;
      if (!b.name) {
        return res.status(422).json({ success: false, message: 'Category name is required' });
      }

      const id = `cat_${b.name}`.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      const existing = await prisma.product_categories.findUnique({ where: { id } });
      if (existing) {
        return res.status(422).json({ success: false, message: 'A category with this name already exists' });
      }

      const maxSort = await prisma.product_categories.aggregate({ _max: { sort_order: true } });
      const now = new Date();

      const category = await prisma.product_categories.create({
        data: {
          id,
          label: b.name,
          tile: 'var(--tile-1)',
          image_url: b.imageUrl || null,
          is_active: b.status !== false,
          sort_order: (maxSort._max.sort_order ?? -1) + 1,
          created_at: now,
          updated_at: now
        }
      });

      return res.status(201).json({ success: true, data: { category } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const b = req.body;

      const existing = await prisma.product_categories.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      const data: any = { updated_at: new Date() };
      if (b.name !== undefined) data.label = b.name;
      if (b.imageUrl !== undefined) data.image_url = b.imageUrl || null;
      if (b.status !== undefined) data.is_active = !!b.status;
      if (b.displayPriority !== undefined) data.sort_order = Number(b.displayPriority);

      const category = await prisma.product_categories.update({ where: { id }, data });

      return res.status(200).json({ success: true, data: { category } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminCategoryController = new AdminCategoryController();
