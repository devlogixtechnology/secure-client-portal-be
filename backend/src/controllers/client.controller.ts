import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import ClientService from '../services/client.service';
import { sendSuccess } from '../utils/response';

/**
 * Get logged-in Client's own profile and assigned Relationship Manager (Client Only)
 */
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  const profileData = await ClientService.getMyProfile(req.user!);
  return sendSuccess(res, profileData, 200, 'Profile retrieved successfully');
};

/**
 * Update logged-in Client's own profile (Client Only)
 */
export const updateMyProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  const updatedProfile = await ClientService.updateMyProfile(req.user!, req.body);
  return sendSuccess(res, updatedProfile, 200, 'Profile updated successfully');
};

export default {
  getMyProfile,
  updateMyProfile
};
