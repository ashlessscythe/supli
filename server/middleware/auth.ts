import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

interface JWTPayload {
  userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
