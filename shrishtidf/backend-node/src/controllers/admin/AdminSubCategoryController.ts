import { Request, Response } from 'express';
import prisma from '../../db/prisma';

function buildWhere(query: Record<string, any>) {
  const { name, categoryId, status } = query;
  const where: any = {};
  if (name) where.label = { contains: name, mode: 'insensitive' };
  if (categoryId) where.category_id = categoryId;
  if (status) where.is_active = status === 'active';
  return where;
}

export class AdminSubCategoryController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildWhere(query);

      const [total, subCategories] = await Promise.all([
        prisma.product_sub_categories.count({ where }),
        prisma.product_sub_categories.findMany({
          where,
          include: { product_categories: true },
          orderBy: [{ category_id: 'asc' }, { sort_order: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const mapped = subCategories.map((s: any) => ({
        id: s.id,
        label: s.label,
        image: s.image_url,
        categoryId: s.category_id,
        category: s.product_categories?.label || '',
        isActive: s.is_active,
        displayPriority: s.sort_order
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

  public async exportSubCategories(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const subCategories = await prisma.product_sub_categories.findMany({
        where,
        include: { product_categories: true },
        orderBy: [{ category_id: 'asc' }, { sort_order: 'asc' }]
      });

      const header = ['Category', 'Sub Category', 'Display Priority', 'Status'];
      const csvRows = subCategories.map((s: any) => [
        s.product_categories?.label || '',
        s.label,
        s.sort_order,
        s.is_active ? 'Activated' : 'Deactivated'
      ]);
      const csv = [header, ...csvRows]
        .map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sub-categories-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const subCategory = await prisma.product_sub_categories.findUnique({ where: { id } });
      if (!subCategory) {
        return res.status(404).json({ success: false, message: 'Sub category not found' });
      }
      return res.status(200).json({ success: true, data: subCategory });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const b = req.body;
      if (!b.name || !b.categoryId) {
        return res.status(422).json({ success: false, message: 'Sub category name and category are required' });
      }

      const category = await prisma.product_categories.findUnique({ where: { id: b.categoryId } });
      if (!category) {
        return res.status(422).json({ success: false, message: 'Selected category does not exist' });
      }

      const id = `sub_${b.name}`.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      const existing = await prisma.product_sub_categories.findUnique({ where: { id } });
      if (existing) {
        return res.status(422).json({ success: false, message: 'A sub category with this name already exists' });
      }

      const maxSort = await prisma.product_sub_categories.aggregate({
        where: { category_id: b.categoryId },
        _max: { sort_order: true }
      });
      const now = new Date();

      const subCategory = await prisma.product_sub_categories.create({
        data: {
          id,
          category_id: b.categoryId,
          label: b.name,
          image_url: b.imageUrl || null,
          is_active: b.status !== false,
          sort_order: (maxSort._max.sort_order ?? -1) + 1,
          created_at: now,
          updated_at: now
        }
      });

      return res.status(201).json({ success: true, data: { subCategory } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const b = req.body;

      const existing = await prisma.product_sub_categories.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Sub category not found' });
      }

      if (b.categoryId) {
        const category = await prisma.product_categories.findUnique({ where: { id: b.categoryId } });
        if (!category) {
          return res.status(422).json({ success: false, message: 'Selected category does not exist' });
        }
      }

      const data: any = { updated_at: new Date() };
      if (b.name !== undefined) data.label = b.name;
      if (b.categoryId !== undefined) data.category_id = b.categoryId;
      if (b.imageUrl !== undefined) data.image_url = b.imageUrl || null;
      if (b.status !== undefined) data.is_active = !!b.status;
      if (b.displayPriority !== undefined) data.sort_order = Number(b.displayPriority);

      const subCategory = await prisma.product_sub_categories.update({ where: { id }, data });

      return res.status(200).json({ success: true, data: { subCategory } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminSubCategoryController = new AdminSubCategoryController();
