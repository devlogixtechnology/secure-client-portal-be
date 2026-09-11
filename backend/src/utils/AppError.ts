export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  // Pre-defined factory methods for clean controller code
  public static badRequest(message: string = 'Bad request', errorCode: string = 'BAD_REQUEST', details?: any): AppError {
    return new AppError(message, 400, errorCode, details);
  }

  public static unauthorized(message: string = 'Unauthorized access', errorCode: string = 'UNAUTHORIZED', details?: any): AppError {
    return new AppError(message, 401, errorCode, details);
  }

  public static forbidden(message: string = 'Forbidden resource', errorCode: string = 'FORBIDDEN', details?: any): AppError {
    return new AppError(message, 403, errorCode, details);
  }

  public static notFound(message: string = 'Resource not found', errorCode: string = 'NOT_FOUND', details?: any): AppError {
    return new AppError(message, 404, errorCode, details);
  }

  public static conflict(message: string = 'Resource conflict', errorCode: string = 'CONFLICT', details?: any): AppError {
    return new AppError(message, 409, errorCode, details);
  }

  public static unprocessable(message: string = 'Unprocessable entity', errorCode: string = 'VALIDATION_ERROR', details?: any): AppError {
    return new AppError(message, 422, errorCode, details);
  }

  public static tooManyRequests(message: string = 'Too many requests, please try again later', errorCode: string = 'RATE_LIMIT_EXCEEDED', details?: any): AppError {
    return new AppError(message, 429, errorCode, details);
  }

  public static internal(message: string = 'Internal server error', errorCode: string = 'INTERNAL_SERVER_ERROR', details?: any): AppError {
    return new AppError(message, 500, errorCode, details);
  }
}

export default AppError;
