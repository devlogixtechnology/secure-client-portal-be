import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/response';
import logger from '../utils/logger';
import config from '../config';

/**
 * Handle MongoDB / Mongoose CastError (e.g., invalid ObjectId)
 */
const handleCastError = (err: any): AppError => {
  const message = `Invalid value '${err.value}' for field '${err.path}'`;
  return new AppError(message, 400, 'INVALID_RESOURCE_ID', { field: err.path, value: err.value });
};

/**
 * Handle MongoDB Duplicate Key Error (E11000)
 */
const handleDuplicateKeyError = (err: any): AppError => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : '';
  const message = `A record with ${field} '${value}' already exists`;
  return new AppError(message, 409, 'DUPLICATE_RESOURCE', { [field]: `${field} must be unique` });
};

/**
 * Handle Mongoose Schema Validation Error
 */
const handleValidationError = (err: any): AppError => {
  const details: Record<string, string> = {};
  if (err.errors) {
    Object.keys(err.errors).forEach((key) => {
      details[key] = err.errors[key].message;
    });
  }
  const message = 'Validation failed for request data';
  return new AppError(message, 422, 'VALIDATION_ERROR', details);
};

/**
 * Handle JWT Verification Errors
 */
const handleJWTError = (): AppError => {
  return new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED');
};

/**
 * Global Error Handling Middleware
 */
export const errorMiddleware: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = err;

  // Transform known library/database errors into standard AppErrors
  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === 'ValidationError' && !(err instanceof AppError)) error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (err instanceof SyntaxError && 'body' in err) {
    error = new AppError('Malformed JSON in request body', 400, 'INVALID_JSON_BODY');
  }

  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'INTERNAL_SERVER_ERROR';
  const message = error.isOperational
    ? error.message
    : (config.isProduction ? 'An unexpected internal server error occurred' : error.message || 'Internal server error');
  const details = error.details || undefined;
  const stack = config.isDevelopment ? error.stack : undefined;

  // Log error with context
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} - 500 Server Error: ${err.message}`, {
      stack: err.stack,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} - ${statusCode} [${errorCode}]: ${message}`, {
      details
    });
  }

  sendError(res, statusCode, errorCode, message, details, stack);
};

export default errorMiddleware;
