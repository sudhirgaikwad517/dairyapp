import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../db/prisma';

export interface DeliveryBoyJwtPayload {
  type: 'delivery_boy';
  id: string;
  phone: string;
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      deliveryBoy?: DeliveryBoyJwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

function getSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable must be set');
  }
  return JWT_SECRET;
}

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function signDeliveryBoyToken(id: string, phone: string) {
  return jwt.sign(
    { type: 'delivery_boy', id, phone, jti: crypto.randomUUID() },
    getSecret(),
    { expiresIn: TOKEN_TTL_SECONDS }
  );
}

export async function authenticateDeliveryBoy(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token) {
      return res.status(401).json({ success: false, errorCode: 'UNAUTHENTICATED', message: 'Login required' });
    }

    const payload = jwt.verify(token, getSecret()) as any;
    if (!payload || payload.type !== 'delivery_boy') {
      return res.status(401).json({ success: false, errorCode: 'UNAUTHENTICATED', message: 'Invalid session' });
    }

    if (payload.jti) {
      const revoked = await prisma.revoked_admin_tokens.findUnique({ where: { jti: payload.jti } });
      if (revoked) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHENTICATED', message: 'Session logged out' });
      }
    }

    req.deliveryBoy = payload as DeliveryBoyJwtPayload;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, errorCode: 'UNAUTHENTICATED', message: 'Session expired' });
  }
}
