import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import { authenticateToken } from './middleware/auth';
import { asyncHandler } from './utils/asyncHandler';

// Initialize environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4321',
  credentials: true,
}));

// Routes
app.use('/api/auth', authRoutes);

// Protected route example
app.get('/api/protected', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
  next();
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing HTTP server and Prisma Client...');
  await server.close();
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
