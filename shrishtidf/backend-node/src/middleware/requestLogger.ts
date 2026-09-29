import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Tags every request with a short correlation id (surfaced back as
 * `X-Request-Id` too, so a client-reported bug can be matched to server
 * logs) and logs one line per request on completion: method, path, status,
 * duration. This is what every controller's scattered `console.error(error)`
 * was missing — a way to find *which* request an error line belongs to.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID().slice(0, 8);
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const line = `[${requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`;
    if (res.statusCode >= 500) console.error(line);
    else if (res.statusCode >= 400) console.warn(line);
    else console.log(line);
  });

  next();
}

/** Last-resort handler for anything a controller's own try/catch missed. */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);
  console.error(`[${req.requestId || '--------'}] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ success: false, message: 'Internal Server Error', requestId: req.requestId });
}
