import { Request, Response } from 'express';
import AuthService from '../services/auth.service';
import { sendSuccess, sendNoContent } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * User Login
 */
export const login = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password, res, req);
  return sendSuccess(res, result, 200, 'Login successful');
};

/**
 * Refresh Access Token
 */
export const refresh = async (req: Request, res: Response): Promise<Response> => {
  const rawRefreshToken = req.cookies?.refresh_token;
  const result = await AuthService.refresh(rawRefreshToken, res);
  return sendSuccess(res, result, 200, 'Token refreshed successfully');
};

/**
 * User Logout
 */
export const logout = async (req: AuthRequest, res: Response): Promise<Response> => {
  const rawRefreshToken = req.cookies?.refresh_token;
  await AuthService.logout(rawRefreshToken, req.user, res);
  return sendNoContent(res);
};

/**
 * Request Password Reset
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<Response> => {
  const { email } = req.body;
  await AuthService.requestPasswordReset(email, req);
  return sendSuccess(
    res,
    undefined,
    200,
    'If an account exists with this email address, a password reset link has been dispatched'
  );
};

/**
 * Confirm Password Reset
 */
export const confirmPasswordReset = async (req: Request, res: Response): Promise<Response> => {
  const { token, new_password, newPassword } = req.body;
  const passwordToSet = new_password || newPassword;
  await AuthService.confirmPasswordReset(token, passwordToSet, req);
  return sendSuccess(res, undefined, 200, 'Password has been reset successfully. Please log in with your new password.');
};

export default {
  login,
  refresh,
  logout,
  requestPasswordReset,
  confirmPasswordReset
};
