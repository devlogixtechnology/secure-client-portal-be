import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '../models/User';

export default function requireRole(...allowed: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' } });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }
    return next();
  };
}