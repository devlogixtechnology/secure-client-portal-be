import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import config from '../config';
import { UserRole } from '../models/User';

export interface IJwtPayload {
  id: string;
  role: UserRole;
  tokenVersion?: number;
}

/**
 * Sign short-lived Access Token (<= 15 minutes per NFR-1.2.8)
 */
export const signAccessToken = (user: { _id: mongoose.Types.ObjectId | string; role: UserRole; tokenVersion?: number }): string => {
  const payload: IJwtPayload = {
    id: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion || 0
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiry as jwt.SignOptions['expiresIn']
  });
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): IJwtPayload => {
  return jwt.verify(token, config.jwt.secret) as IJwtPayload;
};

/**
 * Hash raw token string using SHA-256 for secure database storage
 */
export const hashToken = (rawToken: string): string => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

/**
 * Generate cryptographically secure random token (minimum 128-bit entropy)
 */
export const generateSecureRandomToken = (bytes: number = 48): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

export default {
  signAccessToken,
  verifyAccessToken,
  hashToken,
  generateSecureRandomToken
};
