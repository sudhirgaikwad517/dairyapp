import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import apiRoutes from './routes';
import adminRoutes from './routes/admin';

// Basic Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Node.js Backend is running' });
});

// API Routes
app.use('/api/v1', apiRoutes);
app.use('/api/admin', adminRoutes);

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
