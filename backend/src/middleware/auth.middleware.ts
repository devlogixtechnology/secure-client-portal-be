import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import User, { IUser, UserStatus } from '../models/User';
import AppError from '../utils/AppError';

export interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * Authentication Middleware: Validates Bearer Access Token and attaches active user to request
 */
export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No authentication token provided', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(new AppError('Malformed authorization header', 401, 'INVALID_TOKEN'));
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.id);

    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists', 401, 'INVALID_TOKEN'));
    }

    if (user.status !== UserStatus.ACTIVE) {
      return next(new AppError('User account is currently inactive or deactivated', 403, 'ACCOUNT_INACTIVE'));
    }

    if (payload.tokenVersion !== undefined && user.tokenVersion !== payload.tokenVersion) {
      return next(new AppError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
    }

    req.user = user;
    return next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token', 401, 'INVALID_TOKEN'));
  }
};

export default authenticate;
