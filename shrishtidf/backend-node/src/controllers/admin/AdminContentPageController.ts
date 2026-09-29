import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';

function mapPage(p: any) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    content: p.content,
    isActive: p.is_active,
    sortOrder: p.sort_order,
    updatedAt: p.updated_at
  };
}

export class AdminContentPageController {
  public async index(req: Request, res: Response) {
    try {
      const pages = await prisma.content_pages.findMany({ orderBy: { sort_order: 'asc' } });
      return res.status(200).json({ success: true, data: pages.map(mapPage) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const page = await prisma.content_pages.findUnique({ where: { id: req.params.id as string } });
      if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
      return res.status(200).json({ success: true, data: mapPage(page) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { slug, title, content, status } = req.body;
      if (!slug || !title) return res.status(422).json({ success: false, message: 'Slug and title are required' });

      const existing = await prisma.content_pages.findUnique({ where: { slug } });
      if (existing) return res.status(422).json({ success: false, message: 'A page with this slug already exists' });

      const maxSort = await prisma.content_pages.aggregate({ _max: { sort_order: true } });
      const now = new Date();
      const created = await prisma.content_pages.create({
        data: {
          id: crypto.randomUUID(),
          slug,
          title,
          content: content || '',
          is_active: status !== false,
          sort_order: (maxSort._max.sort_order ?? -1) + 1,
          created_at: now,
          updated_at: now
        }
      });
      return res.status(201).json({ success: true, data: mapPage(created) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const { title, content, status, displayPriority } = req.body;
      const data: any = { updated_at: new Date() };
      if (title !== undefined) data.title = title;
      if (content !== undefined) data.content = content;
      if (status !== undefined) data.is_active = !!status;
      if (displayPriority !== undefined) data.sort_order = Number(displayPriority);

      const updated = await prisma.content_pages.update({ where: { id: req.params.id as string }, data });
      return res.status(200).json({ success: true, data: mapPage(updated) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async destroy(req: Request, res: Response) {
    try {
      await prisma.content_pages.delete({ where: { id: req.params.id as string } });
      return res.status(200).json({ success: true, data: {} });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminContentPageController = new AdminContentPageController();
