import crypto from 'crypto';
import { Request, Response } from 'express';
import User, { IUser, UserRole, UserStatus } from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { comparePassword, hashPassword } from '../utils/password';
import { signAccessToken, hashToken, generateSecureRandomToken } from '../utils/jwt';
import { writeAuditLog } from '../utils/audit';
import AppError from '../utils/AppError';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  /**
   * Login user with email & password, Argon2 verification, rate limiting, and account lockout
   */
  public static async login(
    emailInput: string,
    passwordInput: string,
    res: Response,
    req?: Request
  ): Promise<{ token: string; user: any; expires_in: number }> {
    const email = (emailInput || '').trim().toLowerCase();
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      if (req) {
        await writeAuditLog({
          req,
          actorType: UserRole.CLIENT,
          action: 'auth.login.failed',
          authorizationResult: 'DENIED',
          newValue: { email, reason: 'user_not_found' }
        });
      }
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Check account active status
    if (user.status !== UserStatus.ACTIVE) {
      if (req) {
        await writeAuditLog({
          req,
          actorId: user._id,
          actorType: user.role,
          action: 'auth.login.blocked',
          authorizationResult: 'DENIED',
          newValue: { reason: 'account_inactive' }
        });
      }
      throw AppError.forbidden('Your account is currently inactive or pending assignment', 'ACCOUNT_INACTIVE');
    }

    // Check account lockout status (NFR-1.1.3)
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      if (req) {
        await writeAuditLog({
          req,
          actorId: user._id,
          actorType: user.role,
          action: 'auth.login.locked',
          authorizationResult: 'DENIED',
          newValue: { lockUntil: user.lockUntil }
        });
      }
      throw new AppError(
        `Account is temporarily locked due to failed attempts. Please try again in ${remainingMinutes} minutes.`,
        423,
        'ACCOUNT_LOCKED'
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(passwordInput, user.password);
    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();

      if (req) {
        await writeAuditLog({
          req,
          actorId: user._id,
          actorType: user.role,
          action: 'auth.login.failed',
          authorizationResult: 'DENIED',
          newValue: { failedAttempts: user.failedLoginAttempts }
        });
      }
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Generate Tokens
    const accessToken = signAccessToken(user);
    const rawRefreshToken = generateSecureRandomToken(48);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    });

    // Set HttpOnly refresh token cookie (NFR-1.2.3, NFR-1.2.8)
    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/v1/auth'
    });

    if (req) {
      await writeAuditLog({
        req,
        actorId: user._id,
        actorType: user.role,
        action: 'auth.login.success',
        authorizationResult: 'ALLOWED'
      });
    }

    return {
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        mfaEnabled: user.mfaEnabled
      },
      expires_in: 900 // 15 minutes in seconds
    };
  }

  /**
   * Refresh Access Token with refresh token rotation (NFR-1.2.8)
   */
  public static async refresh(rawRefreshToken: string, res: Response): Promise<{ token: string; expires_in: number }> {
    if (!rawRefreshToken) {
      throw AppError.unauthorized('No refresh token provided', 'NO_REFRESH_TOKEN');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      // If a revoked token is reused, revoke all tokens for this user (Reuse Detection / Session Compromise)
      if (storedToken) {
        await RefreshToken.updateMany({ userId: storedToken.userId }, { revoked: true });
      }
      throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const user = await User.findById(storedToken.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw AppError.unauthorized('User account is no longer active', 'ACCOUNT_INACTIVE');
    }

    // Rotate refresh token
    const newRawRefreshToken = generateSecureRandomToken(48);
    storedToken.revoked = true;
    storedToken.replacedByHash = hashToken(newRawRefreshToken);
    await storedToken.save();

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(newRawRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    });

    res.cookie(REFRESH_COOKIE_NAME, newRawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/v1/auth'
    });

    return {
      token: signAccessToken(user),
      expires_in: 900
    };
  }

  /**
   * Logout user by invalidating refresh token and clearing cookie
   */
  public static async logout(rawRefreshToken: string | undefined, user: IUser | undefined, res: Response): Promise<void> {
    if (rawRefreshToken) {
      await RefreshToken.updateOne({ tokenHash: hashToken(rawRefreshToken) }, { revoked: true });
    }
    if (user) {
      await RefreshToken.updateMany({ userId: user._id }, { revoked: true });
    }

    res.clearCookie(REFRESH_COOKIE_NAME, {
      path: '/v1/auth',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });
  }

  /**
   * Request password reset link (time-expiring token per NFR-1.1.6, FR-1.8)
   */
  public static async requestPasswordReset(emailInput: string, req?: Request): Promise<void> {
    const email = (emailInput || '').trim().toLowerCase();
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashToken(resetToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await user.save();

      if (req) {
        await writeAuditLog({
          req,
          actorId: user._id,
          actorType: user.role,
          action: 'auth.password_reset.requested',
          authorizationResult: 'ALLOWED'
        });
      }
      // Note: In Epic 5 / SMTP integration, email notification will be dispatched
    }
  }

  /**
   * Confirm password reset and invalidate all live sessions
   */
  public static async confirmPasswordReset(token: string, newPassword: string, req?: Request): Promise<void> {
    if (!token || !newPassword || newPassword.length < 12) {
      throw AppError.unprocessable('Password must be at least 12 characters and token is required', 'VALIDATION_ERROR');
    }

    const hashedToken = hashToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: hashedToken,
      passwordResetExpiresAt: { $gt: new Date() }
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      throw AppError.badRequest('Invalid or expired password reset token', 'INVALID_RESET_TOKEN');
    }

    user.password = await hashPassword(newPassword);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all existing access tokens
    await user.save();

    // Revoke all existing sessions in DB
    await RefreshToken.updateMany({ userId: user._id }, { revoked: true });

    if (req) {
      await writeAuditLog({
        req,
        actorId: user._id,
        actorType: user.role,
        action: 'auth.password_reset.confirmed',
        authorizationResult: 'ALLOWED'
      });
    }
  }
}

export default AuthService;
