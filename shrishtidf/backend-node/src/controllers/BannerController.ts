import { Request, Response } from 'express';
import prisma from '../db/prisma';

export class BannerController {
  public async getBanners(req: Request, res: Response) {
    try {
      const now = new Date();
      const dateFilter = {
        OR: [
          { from_date: null, to_date: null },
          { from_date: { lte: now }, to_date: null },
          { from_date: null, to_date: { gte: now } },
          { from_date: { lte: now }, to_date: { gte: now } }
        ]
      };

      const [images, video] = await Promise.all([
        prisma.app_banners.findMany({
          where: { banner_type: 'image', is_active: true, ...dateFilter },
          orderBy: { sort_order: 'asc' }
        }),
        prisma.app_banners.findFirst({
          where: { banner_type: 'video', is_active: true, ...dateFilter },
          orderBy: { sort_order: 'asc' }
        })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          topBanners: images.map((b: any) => b.media_url),
          secondBannerVideo: video?.media_url || ''
        }
      });
    } catch (error) {
      console.error('Error fetching banners:', error);
      return res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
    }
  }
}

export const bannerController = new BannerController();
