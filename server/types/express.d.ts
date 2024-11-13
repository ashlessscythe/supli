import { UserRole } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
      };
    }
  }
}
