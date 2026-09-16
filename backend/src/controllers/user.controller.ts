import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import UserService from '../services/user.service';
import { sendSuccess, sendCreated } from '../utils/response';

/**
 * Create Employee Account (Admin Only)
 */
export const createEmployee = async (req: AuthRequest, res: Response): Promise<Response> => {
  const result = await UserService.createEmployee(req.body, req.user!, req);
  return sendCreated(res, result, 'Employee account created successfully');
};

/**
 * Create Client Account (Admin Only)
 */
export const createClient = async (req: AuthRequest, res: Response): Promise<Response> => {
  const result = await UserService.createClient(req.body, req.user!, req);
  return sendCreated(res, result, 'Client account created successfully');
};

/**
 * List All Users (Admin Only)
 */
export const listUsers = async (req: AuthRequest, res: Response): Promise<Response> => {
  const { users, meta } = await UserService.listUsers(req.query);
  return sendSuccess(res, users, 200, 'Users retrieved successfully', meta);
};

/**
 * Get User Details by ID (Admin Only)
 */
export const getUserById = async (req: AuthRequest, res: Response): Promise<Response> => {
  const userId = req.params.user_id || req.params.id;
  const user = await UserService.getUserById(userId);
  return sendSuccess(res, user, 200, 'User details retrieved successfully');
};

/**
 * Update User Details (Admin Only)
 */
export const updateUser = async (req: AuthRequest, res: Response): Promise<Response> => {
  const userId = req.params.user_id || req.params.id;
  const user = await UserService.updateUser(userId, req.body, req.user!, req);
  return sendSuccess(res, user, 200, 'User updated successfully');
};

/**
 * Deactivate User (Soft Delete) (Admin Only)
 */
export const deactivateUser = async (req: AuthRequest, res: Response): Promise<Response> => {
  const userId = req.params.user_id || req.params.id;
  await UserService.deactivateUser(userId, req.user!, req);
  return sendSuccess(res, { id: userId, status: 'INACTIVE' }, 200, 'User account deactivated successfully');
};

/**
 * Reactivate User (Admin Only)
 */
export const reactivateUser = async (req: AuthRequest, res: Response): Promise<Response> => {
  const userId = req.params.user_id || req.params.id;
  await UserService.reactivateUser(userId, req.user!, req);
  return sendSuccess(res, { id: userId, status: 'ACTIVE' }, 200, 'User account reactivated successfully');
};

/**
 * Send Client Credentials (Admin Only)
 */
export const sendClientCredentials = async (req: AuthRequest, res: Response): Promise<Response> => {
  const userId = req.params.user_id || req.params.id;
  await UserService.sendClientCredentials(userId, req.user!, req);
  return sendSuccess(res, undefined, 200, 'Client credentials marked as sent');
};

export default {
  createEmployee,
  createClient,
  listUsers,
  getUserById,
  updateUser,
  deactivateUser,
  reactivateUser,
  sendClientCredentials
};
