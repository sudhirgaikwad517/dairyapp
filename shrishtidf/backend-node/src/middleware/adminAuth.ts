import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../db/prisma';
import { ALL_MODULE_KEYS } from '../constants/accessControlModules';

const MODULE_KEY_SET = new Set(ALL_MODULE_KEYS);

export type PermissionAction = 'view' | 'create' | 'update' | 'pdf' | 'excel';

interface AdminJwtPayload {
  type: 'admin';
  id: string;
  email: string;
  jti: string;
}

interface StaffJwtPayload {
  type: 'staff';
  officeStaffId: string;
  staffTypeId: string;
  name: string;
  jti: string;
}

export type AuthUser = AdminJwtPayload | StaffJwtPayload;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

// Validated once at module load (i.e. at server boot, since every route file
// that needs auth imports this module) rather than silently falling back to a
// public, hardcoded secret — a missing env var must never let anyone forge a
// valid admin/staff session token.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set — refusing to start with an insecure default.');
}

function getSecret() {
  return JWT_SECRET as string;
}

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export function signAdminToken(id: string, email: string) {
  return jwt.sign({ type: 'admin', id, email, jti: crypto.randomUUID() }, getSecret(), { expiresIn: TOKEN_TTL_SECONDS });
}

export function signStaffToken(officeStaffId: string, staffTypeId: string, name: string) {
  return jwt.sign(
    { type: 'staff', officeStaffId, staffTypeId, name, jti: crypto.randomUUID() },
    getSecret(),
    { expiresIn: TOKEN_TTL_SECONDS }
  );
}

/** Invalidates a token immediately, independent of its 7-day expiry — called on logout. */
export async function revokeToken(jti: string) {
  if (!jti) return;
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
  await prisma.revoked_admin_tokens.upsert({
    where: { jti },
    update: {},
    create: { jti, expires_at: expiresAt }
  });
  // Best-effort garbage collection so this table doesn't grow forever —
  // piggybacks on a revoke call rather than needing a separate cron job.
  await prisma.revoked_admin_tokens.deleteMany({ where: { expires_at: { lt: new Date() } } }).catch(() => {});
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token) {
      return res.status(401).json({ success: false, errorCode: 'UNAUTHENTICATED', message: 'Login required' });
    }

    const payload = jwt.verify(token, getSecret()) as any;
    if (!payload || (payload.type !== 'admin' && payload.type !== 'staff')) {
      return res.status(401).json({ success: false, errorCode: 'UNAUTHENTICATED', message: 'Invalid session — please log in again' });
    }

    if (payload.jti) {
      const revoked = await prisma.revoked_admin_tokens.findUnique({ where: { jti: payload.jti } });
      if (revoked) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHENTICATED', message: 'Session has been logged out — please log in again' });
      }
    }

    req.authUser = payload as AuthUser;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, errorCode: 'UNAUTHENTICATED', message: 'Session expired — please log in again' });
  }
}

/**
 * Gates a route behind a specific module + action permission.
 * Super-admin (type: 'admin') always passes. A staff user must have an
 * access_controls row with the matching permission column set to true.
 */
export function requirePermission(moduleKey: string, action: PermissionAction) {
  if (!MODULE_KEY_SET.has(moduleKey)) {
    throw new Error(`requirePermission: unknown module key "${moduleKey}"`);
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.authUser;
    if (!user) return res.status(401).json({ success: false, errorCode: 'UNAUTHENTICATED', message: 'Login required' });
    if (user.type === 'admin') return next();

    try {
      const accessControl = await prisma.access_controls.findUnique({ where: { office_staff_id: user.officeStaffId } });
      if (!accessControl) {
        return res.status(403).json({ success: false, errorCode: 'FORBIDDEN', message: 'You do not have access to this module. Contact your admin.' });
      }

      const permission = await prisma.access_control_permissions.findUnique({
        where: { access_control_id_module_key: { access_control_id: accessControl.id, module_key: moduleKey } }
      });

      const columnMap: Record<PermissionAction, string> = {
        view: 'can_view',
        create: 'can_create',
        update: 'can_update',
        pdf: 'can_pdf',
        excel: 'can_excel'
      };
      const allowed = permission ? (permission as any)[columnMap[action]] : false;
      if (!allowed) {
        return res.status(403).json({ success: false, errorCode: 'FORBIDDEN', message: 'You do not have permission to perform this action.' });
      }

      return next();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  };
}

/** Gates a route to the super-admin only — used for the access-control module itself, so no staff permission can ever grant themselves more access. */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser) return res.status(401).json({ success: false, errorCode: 'UNAUTHENTICATED', message: 'Login required' });
  if (req.authUser.type !== 'admin') {
    return res.status(403).json({ success: false, errorCode: 'FORBIDDEN', message: 'Only a super-admin can manage user access control.' });
  }
  return next();
}
