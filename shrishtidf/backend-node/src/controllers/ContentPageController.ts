import { Request, Response } from 'express';
import prisma from '../db/prisma';

export class ContentPageController {
  // "Policies" list screen — every active page except About Us, which the app
  // links to directly from the menu.
  public async index(req: Request, res: Response) {
    try {
      const { exclude } = req.query as Record<string, string>;
      const where: any = { is_active: true };
      if (exclude) where.slug = { not: exclude };

      const pages = await prisma.content_pages.findMany({
        where,
        orderBy: { sort_order: 'asc' },
        select: { id: true, slug: true, title: true, sort_order: true }
      });
      return res.status(200).json({
        success: true,
        data: pages.map((p: any) => ({ id: p.id, slug: p.slug, title: p.title }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const page = await prisma.content_pages.findFirst({
        where: { slug: req.params.slug as string, is_active: true }
      });
      if (!page) return res.status(404).json({ success: false, message: 'Page not found' });

      return res.status(200).json({
        success: true,
        data: { slug: page.slug, title: page.title, content: page.content, updatedAt: page.updated_at }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const contentPageController = new ContentPageController();
