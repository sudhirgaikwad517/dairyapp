import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function toSafeJson(value: any) {
  return JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? Number(v) : v)));
}

function buildProductWhere(query: Record<string, any>) {
  const { name, categoryId, subCategoryId } = query;
  const where: any = {};
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (categoryId) where.category_id = categoryId;
  if (subCategoryId) where.sub_category_id = subCategoryId;
  return where;
}

export class AdminProductController {
  public async getProducts(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildProductWhere(query);

      const [total, products] = await Promise.all([
        prisma.products.count({ where }),
        prisma.products.findMany({
          where,
          include: { product_categories: true, product_sub_categories: true, product_variants: true },
          orderBy: { sort_order: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const mapped = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        shortCode: p.short_code,
        discount: p.discount,
        gst: Number(p.gst_rate || 0),
        category: p.product_categories?.label || 'Uncategorized',
        categoryId: p.category_id,
        subCategory: p.product_sub_categories?.label || '',
        subCategoryId: p.sub_category_id,
        description: p.description,
        hsnCode: p.hsn_code,
        image: p.image_url,
        displayPriority: p.sort_order,
        isActive: p.is_active,
        variantCount: p.product_variants.length
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

  public async exportProducts(req: Request, res: Response) {
    try {
      const where = buildProductWhere(req.query as Record<string, string>);
      const products = await prisma.products.findMany({
        where,
        include: { product_categories: true, product_sub_categories: true },
        orderBy: { sort_order: 'asc' }
      });

      const header = ['Product Name', 'Shortcode', 'Discount(Rs)', 'GST', 'Category', 'Sub Category', 'HSN Code', 'Display Priority', 'Status'];
      const csvRows = products.map((p: any) => [
        p.name || '',
        p.short_code || '',
        p.discount || 0,
        Number(p.gst_rate || 0),
        p.product_categories?.label || '',
        p.product_sub_categories?.label || '',
        p.hsn_code || '',
        p.sort_order || 0,
        p.is_active ? 'Active' : 'Inactive'
      ]);
      const csv = [header, ...csvRows]
        .map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="products-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async getProduct(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const product = await prisma.products.findUnique({
        where: { id },
        include: {
          product_categories: true,
          product_sub_categories: true,
          product_images: { orderBy: { sort_order: 'asc' } },
          product_variants: { orderBy: { sort_order: 'asc' } }
        }
      });

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      return res.status(200).json({ success: true, data: toSafeJson(product) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async createProduct(req: Request, res: Response) {
    try {
      const b = req.body;
      if (!b.categoryId || !b.name || !b.shortCode) {
        return res.status(422).json({ success: false, message: 'Category, product name and shortcode are required' });
      }

      const id = `prod_${b.shortCode}`.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      const now = new Date();
      const variants = Array.isArray(b.variants) ? b.variants : [];
      const firstVariant = variants[0];

      const product = await prisma.$transaction(async (tx) => {
        const created = await tx.products.create({
          data: {
            id,
            category_id: b.categoryId,
            sub_category_id: b.subCategoryId || null,
            product_type: b.productType || null,
            name: b.name,
            short_code: b.shortCode,
            size: firstVariant?.packaging || 'N/A',
            buy_once: Number(firstVariant?.rate || 0),
            subscription: Number(firstVariant?.rate || 0),
            discount: Number(b.discount || 0),
            gst_rate: Number(b.gstRate || 0),
            description: b.description || null,
            hsn_code: b.hsnCode || null,
            image_url: b.imageUrl || null,
            prepaid_getonce: b.prepaidGetonce !== false,
            prepaid_subscribe: b.prepaidSubscribe !== false,
            postpaid_getonce: b.postpaidGetonce !== false,
            postpaid_subscribe: b.postpaidSubscribe !== false,
            is_active: true,
            stock_quantity: 100,
            created_at: now,
            updated_at: now
          }
        });

        for (const [index, v] of variants.entries()) {
          const stockQty = Number(v.stockQuantity ?? 0);
          await tx.product_variants.create({
            data: {
              id: crypto.randomUUID(),
              product_id: created.id,
              sku: `${created.id}-${index + 1}`.toUpperCase(),
              size_label: v.packaging || '',
              city: v.city || null,
              packets: Number(v.packets || 1),
              ltrs: v.ltrs !== undefined && v.ltrs !== '' ? Number(v.ltrs) : null,
              buy_once: Number(v.rate || 0),
              subscription: Number(v.rate || 0),
              mrp_ecom: Number(v.mrpEcom || 0),
              bottle_applicable: !!v.bottleApplicable,
              pouch_applicable: !!v.pouchApplicable,
              stock_quantity: stockQty,
              out_of_stock: stockQty <= 0,
              web_visibility: v.webVisibility !== false,
              app_visibility: v.appVisibility !== false,
              is_default: index === 0,
              sort_order: index,
              created_at: now,
              updated_at: now
            }
          });
        }

        if (Array.isArray(b.images)) {
          for (const [index, url] of b.images.entries()) {
            if (!url) continue;
            await tx.product_images.create({
              data: { id: crypto.randomUUID(), product_id: created.id, image_url: url, sort_order: index, created_at: now }
            });
          }
        }

        return created;
      });

      return res.status(201).json({ success: true, data: { product } });
    } catch (error: any) {
      console.error(error);
      if (error.code === 'P2002') {
        return res.status(422).json({ success: false, message: 'A product with this shortcode already exists' });
      }
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async updateProduct(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const b = req.body;

      const existing = await prisma.products.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const now = new Date();
      const variants = Array.isArray(b.variants) ? b.variants : [];

      await prisma.$transaction(async (tx) => {
        const data: any = { updated_at: now };
        if (b.categoryId !== undefined) data.category_id = b.categoryId;
        if (b.subCategoryId !== undefined) data.sub_category_id = b.subCategoryId || null;
        if (b.productType !== undefined) data.product_type = b.productType || null;
        if (b.name !== undefined) data.name = b.name;
        if (b.shortCode !== undefined) data.short_code = b.shortCode;
        if (b.discount !== undefined) data.discount = Number(b.discount || 0);
        if (b.gstRate !== undefined) data.gst_rate = Number(b.gstRate || 0);
        if (b.description !== undefined) data.description = b.description || null;
        if (b.hsnCode !== undefined) data.hsn_code = b.hsnCode || null;
        if (b.imageUrl !== undefined) data.image_url = b.imageUrl || null;
        if (b.prepaidGetonce !== undefined) data.prepaid_getonce = !!b.prepaidGetonce;
        if (b.prepaidSubscribe !== undefined) data.prepaid_subscribe = !!b.prepaidSubscribe;
        if (b.postpaidGetonce !== undefined) data.postpaid_getonce = !!b.postpaidGetonce;
        if (b.postpaidSubscribe !== undefined) data.postpaid_subscribe = !!b.postpaidSubscribe;
        if (b.displayPriority !== undefined) data.sort_order = Number(b.displayPriority);
        if (b.isActive !== undefined) data.is_active = !!b.isActive;
        if (variants[0]) {
          data.buy_once = Number(variants[0].rate || 0);
          data.subscription = Number(variants[0].rate || 0);
          data.size = variants[0].packaging || existing.size;
        }

        await tx.products.update({ where: { id }, data });

        if (Array.isArray(b.variants)) {
          const incomingIds = variants.filter((v: any) => v.id).map((v: any) => v.id);
          await tx.product_variants.deleteMany({
            where: { product_id: id, id: { notIn: incomingIds.length ? incomingIds : ['__none__'] } }
          });

          for (const [index, v] of variants.entries()) {
            const stockQty = Number(v.stockQuantity ?? 0);
            const variantData = {
              size_label: v.packaging || '',
              city: v.city || null,
              packets: Number(v.packets || 1),
              ltrs: v.ltrs !== undefined && v.ltrs !== '' ? Number(v.ltrs) : null,
              buy_once: Number(v.rate || 0),
              subscription: Number(v.rate || 0),
              mrp_ecom: Number(v.mrpEcom || 0),
              bottle_applicable: !!v.bottleApplicable,
              pouch_applicable: !!v.pouchApplicable,
              stock_quantity: stockQty,
              out_of_stock: stockQty <= 0,
              web_visibility: v.webVisibility !== false,
              app_visibility: v.appVisibility !== false,
              sort_order: index,
              updated_at: now
            };

            if (v.id) {
              await tx.product_variants.update({ where: { id: v.id }, data: variantData });
            } else {
              await tx.product_variants.create({
                data: {
                  id: crypto.randomUUID(),
                  product_id: id,
                  sku: `${id}-${Date.now()}-${index}`.toUpperCase(),
                  is_default: index === 0,
                  created_at: now,
                  ...variantData
                }
              });
            }
          }
        }

        if (Array.isArray(b.images)) {
          await tx.product_images.deleteMany({ where: { product_id: id } });
          for (const [index, url] of b.images.entries()) {
            if (!url) continue;
            await tx.product_images.create({
              data: { id: crypto.randomUUID(), product_id: id, image_url: url, sort_order: index, created_at: now }
            });
          }
        }
      });

      const updated = await prisma.products.findUnique({
        where: { id },
        include: { product_variants: true, product_images: true }
      });

      return res.status(200).json({ success: true, data: { product: toSafeJson(updated) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async getCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.product_categories.findMany({
        orderBy: { sort_order: 'asc' }
      });

      const mapped = categories.map((c: any) => ({
        id: c.id,
        label: c.label,
        description: c.description,
        is_active: c.is_active,
        sort: c.sort_order
      }));

      return res.status(200).json({ success: true, data: mapped });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async getSubCategories(req: Request, res: Response) {
    try {
      const categoryId = req.query.categoryId as string;
      const where: any = { is_active: true };
      if (categoryId) where.category_id = categoryId;

      const subCategories = await prisma.product_sub_categories.findMany({
        where,
        orderBy: { sort_order: 'asc' }
      });

      return res.status(200).json({
        success: true,
        data: subCategories.map((s: any) => ({ id: s.id, label: s.label, categoryId: s.category_id }))
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminProductController = new AdminProductController();
