import { Router } from 'express';
import {
  login,
  refresh,
  logout,
  requestPasswordReset,
  confirmPasswordReset
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimit.middleware';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

/**
 * @route   POST /auth/login
 * @desc    Authenticate user & issue tokens
 * @access  Public
 */
router.post('/login', authRateLimiter, catchAsync(login));

/**
 * @route   POST /auth/refresh
 * @desc    Rotate and refresh access token via HttpOnly cookie
 * @access  Public
 */
router.post('/refresh', catchAsync(refresh));

/**
 * @route   POST /auth/logout
 * @desc    Invalidate tokens and clear cookie
 * @access  Authenticated
 */
router.post('/logout', catchAsync(authenticate), catchAsync(logout));

/**
 * @route   POST /auth/password-reset/request
 * @desc    Request single-use password reset link
 * @access  Public
 */
router.post('/password-reset/request', passwordResetRateLimiter, catchAsync(requestPasswordReset));

/**
 * @route   POST /auth/password-reset/confirm
 * @desc    Confirm password reset with token
 * @access  Public
 */
router.post('/password-reset/confirm', passwordResetRateLimiter, catchAsync(confirmPasswordReset));

export default router;
