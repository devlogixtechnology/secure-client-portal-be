import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async handler wrapper to automatically forward rejected promises to the global error middleware
 */
export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
