import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';
import { formatDateOnly } from '../../services/CutoffService';

function buildWhere(query: Record<string, any>) {
  const { title, bannerType, status } = query;
  const where: any = {};
  if (title) where.title = { contains: title, mode: 'insensitive' };
  if (bannerType) where.banner_type = bannerType;
  if (status) where.is_active = status === 'active';
  return where;
}

function computeStatus(banner: any) {
  if (!banner.is_active) return 'Deactivated';
  const now = new Date();
  if (banner.from_date && new Date(banner.from_date) > now) return 'Scheduled';
  if (banner.to_date && new Date(banner.to_date) < now) return 'Expired';
  return 'Activated';
}

export class AdminBannerController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildWhere(query);

      const [total, banners] = await Promise.all([
        prisma.app_banners.count({ where }),
        prisma.app_banners.findMany({
          where,
          orderBy: [{ banner_type: 'asc' }, { sort_order: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const mapped = banners.map((b: any) => ({
        id: b.id,
        bannerType: b.banner_type,
        title: b.title,
        mediaUrl: b.media_url,
        fromDate: b.from_date,
        toDate: b.to_date,
        isActive: b.is_active,
        displayPriority: b.sort_order,
        status: computeStatus(b)
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

  public async exportBanners(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const banners = await prisma.app_banners.findMany({ where, orderBy: [{ banner_type: 'asc' }, { sort_order: 'asc' }] });

      const header = ['Title', 'Type', 'From Date', 'To Date', 'Display Priority', 'Status'];
      const csvRows = banners.map((b: any) => [
        b.title,
        b.banner_type,
        b.from_date ? formatDateOnly(new Date(b.from_date)) : '',
        b.to_date ? formatDateOnly(new Date(b.to_date)) : '',
        b.sort_order,
        computeStatus(b)
      ]);
      const csv = [header, ...csvRows]
        .map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="banners-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const banner = await prisma.app_banners.findUnique({ where: { id } });
      if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
      }
      return res.status(200).json({ success: true, data: { ...banner, status: computeStatus(banner) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const b = req.body;
      if (!b.title || !b.mediaUrl || !b.bannerType) {
        return res.status(422).json({ success: false, message: 'Title, media URL and banner type are required' });
      }
      if (!['image', 'video'].includes(b.bannerType)) {
        return res.status(422).json({ success: false, message: 'Banner type must be image or video' });
      }

      const maxSort = await prisma.app_banners.aggregate({
        where: { banner_type: b.bannerType },
        _max: { sort_order: true }
      });
      const now = new Date();

      const banner = await prisma.app_banners.create({
        data: {
          id: crypto.randomUUID(),
          banner_type: b.bannerType,
          title: b.title,
          media_url: b.mediaUrl,
          from_date: b.fromDate ? new Date(b.fromDate) : null,
          to_date: b.toDate ? new Date(b.toDate) : null,
          is_active: b.status !== false,
          sort_order: (maxSort._max.sort_order ?? -1) + 1,
          created_at: now,
          updated_at: now
        }
      });

      return res.status(201).json({ success: true, data: { banner } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const b = req.body;

      const existing = await prisma.app_banners.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
      }

      const data: any = { updated_at: new Date() };
      if (b.title !== undefined) data.title = b.title;
      if (b.mediaUrl !== undefined) data.media_url = b.mediaUrl;
      if (b.fromDate !== undefined) data.from_date = b.fromDate ? new Date(b.fromDate) : null;
      if (b.toDate !== undefined) data.to_date = b.toDate ? new Date(b.toDate) : null;
      if (b.status !== undefined) data.is_active = !!b.status;
      if (b.displayPriority !== undefined) data.sort_order = Number(b.displayPriority);

      const banner = await prisma.app_banners.update({ where: { id }, data });

      return res.status(200).json({ success: true, data: { banner } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async remove(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.app_banners.delete({ where: { id } });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminBannerController = new AdminBannerController();
