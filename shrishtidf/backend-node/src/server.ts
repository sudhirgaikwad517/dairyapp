import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { requestLogger, errorHandler } from './middleware/requestLogger';

dotenv.config();

// A crash here is silent otherwise — nothing logs it, the process just dies.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

const app = express();
const port = process.env.PORT || 5000;

app.use(requestLogger);

// Security headers as defense-in-depth (this API is consumed by three
// different frontends over CORS, so cross-origin isolation policies are
// disabled rather than fighting them; CSP is scoped to what the one HTML page
// this backend serves — the printable invoice — actually needs).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS_ORIGIN is a comma-separated allow-list (e.g. the admin panel and
// website's real domains) for production. Left unset, every origin is
// allowed — the same permissive behavior this API has always had — so local
// development keeps working without any extra setup.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // No Origin header means the caller isn't a browser (native app, curl,
    // server-to-server) — CORS only ever governs browser requests.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Admin-uploaded files (splash/login images, ...).
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

import apiRoutes from './routes';
import adminRoutes from './routes/admin';

// Basic Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Node.js Backend is running' });
});

// API Routes
app.use('/api/v1', apiRoutes);
app.use('/api/admin', adminRoutes);

// Catches anything a controller's own try/catch didn't — must be registered
// after all routes.
app.use(errorHandler);

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
