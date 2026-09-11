import { Response } from 'express';

export interface IApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export interface IApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
}

/**
 * Standard Success Response Helper
 */
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  statusCode: number = 200,
  message?: string,
  meta?: IApiResponse['meta']
): Response => {
  const payload: IApiResponse<T> = {
    success: true
  };

  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;
  if (meta !== undefined) payload.meta = meta;

  return res.status(statusCode).json(payload);
};

/**
 * Standard Created (201) Response Helper
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response => {
  return sendSuccess(res, data, 201, message);
};

/**
 * Standard No Content (204) Response Helper
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Standard Error Response Helper
 */
export const sendError = (
  res: Response,
  statusCode: number = 500,
  code: string = 'INTERNAL_SERVER_ERROR',
  message: string = 'An unexpected error occurred',
  details?: any,
  stack?: string
): Response => {
  const payload: IApiErrorResponse = {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
      ...(stack !== undefined && { stack })
    }
  };

  return res.status(statusCode).json(payload);
};

export default {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendError
};
