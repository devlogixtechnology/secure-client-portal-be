// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { comparePassword, hashPassword } from '../utils/password';
import { writeAuditLog } from '../utils/audit';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const signAccessToken = (user: any) =>
  jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRY || '15m') as jwt.SignOptions['expiresIn'] }
  );

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const hashResetToken = hashToken;

const issueRefreshToken = async (userId: string) => {
  const raw = crypto.randomBytes(48).toString('hex');
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS)
  });
  return raw;
};

const setRefreshCookie = (res: Response, raw: string) => {
  res.cookie(REFRESH_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TTL_MS,
    path: '/v1/auth'
  });
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.status !== 'ACTIVE') {
      await writeAuditLog({ req, actorType: 'UNKNOWN', action: 'auth.login', outcome: 'failure', metadata: { email } });
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      await writeAuditLog({ req, actorId: user._id.toString(), actorType: user.role, action: 'auth.login', outcome: 'denied', metadata: { reason: 'locked' } });
      return res.status(423).json({ error: { code: 'ACCOUNT_LOCKED', message: 'Account temporarily locked due to failed attempts. Try again later.' } });
    }

    const match = await comparePassword(password, user.password);
    if (!match) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= LOCKOUT_THRESHOLD) {
        user.lockUntil = new Date(Date.now() + LOCKOUT_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      await writeAuditLog({ req, actorId: user._id.toString(), actorType: user.role, action: 'auth.login', outcome: 'failure' });
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    const refreshRaw = await issueRefreshToken(user._id.toString());
    setRefreshCookie(res, refreshRaw);

    await writeAuditLog({ req, actorId: user._id.toString(), actorType: user.role, action: 'auth.login', outcome: 'success' });

    return res.status(200).json({
      success: true,
      data: {
        token: signAccessToken(user),
        user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, mfaEnabled: user.mfaEnabled },
        expires_in: 900
      }
    });
  } catch (err) { return next(err); }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) return res.status(401).json({ error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token provided' } });

    const tokenHash = hashToken(raw);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      // reuse of a dead/rotated token is suspicious — belt-and-suspenders: nuke all sessions for that user if we can identify them
      if (stored) {
        await RefreshToken.updateMany({ userId: stored.userId }, { revoked: true });
      }
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' } });
    }

    const user = await User.findById(stored.userId);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    }

    // rotate: kill the old one, issue a new one
    const newRaw = await issueRefreshToken(user._id.toString());
    stored.revoked = true;
    stored.replacedByHash = hashToken(newRaw);
    await stored.save();

    setRefreshCookie(res, newRaw);

    return res.status(200).json({ success: true, data: { token: signAccessToken(user), expires_in: 900 } });
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' } });
  }
};

export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = await User.findOne({ email }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashResetToken(resetToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      await writeAuditLog({ req, actorId: user._id.toString(), actorType: user.role, action: 'auth.password_reset.requested', outcome: 'success' });
      console.log(`[stub] would email password reset link to ${email}`);
    }

    return res.status(200).json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (err) { return next(err); }
};

export const confirmPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, new_password: newPassword } = req.body;
    if (typeof token !== 'string' || typeof newPassword !== 'string' || newPassword.length < 12) {
      return res.status(422).json({ error: { code: 'INVALID_RESET_REQUEST', message: 'A valid token and password of at least 12 characters are required' } });
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpiresAt: { $gt: new Date() }
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      return res.status(400).json({ error: { code: 'INVALID_RESET_TOKEN', message: 'Invalid or expired password reset token' } });
    }

    user.password = await hashPassword(newPassword);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // kills every live access token
    await user.save();

    await RefreshToken.updateMany({ userId: user._id }, { revoked: true }); // kills every live session

    await writeAuditLog({ req, actorId: user._id.toString(), actorType: user.role, action: 'auth.password_reset.confirmed', outcome: 'success' });

    return res.status(200).json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) { return next(err); }
};