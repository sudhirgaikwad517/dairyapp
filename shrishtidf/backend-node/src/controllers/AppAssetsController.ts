import { Request, Response } from 'express';
import prisma from '../db/prisma';

const SPLASH_KEY = 'splash_image_url';
const LOGIN_KEY = 'login_image_url';

function resolveUrl(req: Request, relativePath: string | null): string | null {
  if (!relativePath) return null;
  return `${req.protocol}://${req.get('host')}/${relativePath}`;
}

export class AppAssetsController {
  // Splash screen + login screen images, when the admin has uploaded a
  // custom one — the app falls back to its bundled default when either is
  // null, so this never blocks either screen from rendering.
  public async index(req: Request, res: Response) {
    try {
      const [splash, login] = await Promise.all([
        prisma.site_settings.findUnique({ where: { key: SPLASH_KEY } }),
        prisma.site_settings.findUnique({ where: { key: LOGIN_KEY } })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          splashImageUrl: resolveUrl(req, (splash?.value as any) || null),
          loginImageUrl: resolveUrl(req, (login?.value as any) || null)
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const appAssetsController = new AppAssetsController();
