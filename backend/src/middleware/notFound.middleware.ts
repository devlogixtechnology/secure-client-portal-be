import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * 404 Not Found Middleware for unhandled routes
 */
export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
};

export default notFoundMiddleware;
