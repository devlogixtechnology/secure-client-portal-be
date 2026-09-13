// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export default async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'NO_TOKEN', message: 'No token provided' } });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET!) as { id: string; tokenVersion: number };
    const user = await User.findById(payload.id);
    if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
  }
}