import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '../models/User';
import AppError from '../utils/AppError';

/**
 * Role-Based Access Control (RBAC) Middleware Guard (NFR-1.3.1, GRC-SEC-02)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('User must be authenticated', 401, 'UNAUTHORIZED'));
    }

    // SUPER_ADMIN has full system access across all roles
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to access this resource', 403, 'FORBIDDEN'));
    }

    return next();
  };
};

export default requireRole;
