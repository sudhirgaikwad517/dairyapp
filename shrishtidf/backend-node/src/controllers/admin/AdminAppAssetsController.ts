import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import prisma from '../../db/prisma';

const SPLASH_KEY = 'splash_image_url';
const LOGIN_KEY = 'login_image_url';

const UPLOAD_DIR = path.join(__dirname, '../../../uploads/app-assets');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${(req.params.slot as string)}-${crypto.randomUUID()}${ext}`);
  }
});

function imageFileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
}

export const appAssetUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }
});

function resolveUrl(req: Request, relativePath: string | null): string | null {
  if (!relativePath) return null;
  return `${req.protocol}://${req.get('host')}/${relativePath}`;
}

function settingKeyForSlot(slot: string): string | null {
  if (slot === 'splash') return SPLASH_KEY;
  if (slot === 'login') return LOGIN_KEY;
  return null;
}

export class AdminAppAssetsController {
  public async show(req: Request, res: Response) {
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
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async upload(req: Request, res: Response) {
    try {
      const slot = req.params.slot as string;
      const key = settingKeyForSlot(slot);
      if (!key) return res.status(422).json({ success: false, message: 'Unknown image slot' });

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(422).json({ success: false, message: 'No image file uploaded' });

      const previous = await prisma.site_settings.findUnique({ where: { key } });
      const relativePath = `uploads/app-assets/${file.filename}`;
      const now = new Date();
      await prisma.site_settings.upsert({
        where: { key },
        update: { value: relativePath, updated_at: now },
        create: { key, value: relativePath, created_at: now, updated_at: now }
      });

      // Best-effort cleanup of the file this one replaces.
      const previousPath = previous?.value as any;
      if (previousPath && typeof previousPath === 'string') {
        const absolute = path.join(__dirname, '../../../', previousPath);
        fs.unlink(absolute, () => {});
      }

      return res.status(200).json({ success: true, data: { url: resolveUrl(req, relativePath) } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async destroy(req: Request, res: Response) {
    try {
      const slot = req.params.slot as string;
      const key = settingKeyForSlot(slot);
      if (!key) return res.status(422).json({ success: false, message: 'Unknown image slot' });

      const previous = await prisma.site_settings.findUnique({ where: { key } });
      await prisma.site_settings.delete({ where: { key } }).catch(() => {});

      const previousPath = previous?.value as any;
      if (previousPath && typeof previousPath === 'string') {
        const absolute = path.join(__dirname, '../../../', previousPath);
        fs.unlink(absolute, () => {});
      }

      return res.status(200).json({ success: true, data: {} });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminAppAssetsController = new AdminAppAssetsController();
