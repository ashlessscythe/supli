import type { Request, Response, Router } from 'express';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router: Router = express.Router();
const prisma = new PrismaClient();

interface RegisterRequest {
  username: string;
  password: string;
  role: UserRole;
}

interface LoginRequest {
  username: string;
  password: string;
}

// Register new user
router.post('/register', asyncHandler(async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  const { username, password, role } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role,
    },
  });

  // Create JWT token
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  // Set cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  res.status(201).json({
    message: 'User created successfully',
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
}));

// Login user
router.post('/login', asyncHandler(async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  const { username, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check password
  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create JWT token
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  // Set cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
}));

// Logout user
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
