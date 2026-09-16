import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import EmployeeService from '../services/employee.service';
import { sendSuccess } from '../utils/response';

/**
 * List all clients assigned to the requesting Employee (Employee Only)
 */
export const getMyClients = async (req: AuthRequest, res: Response): Promise<Response> => {
  const clients = await EmployeeService.getMyClients(req.user!);
  return sendSuccess(res, clients, 200, 'Assigned clients retrieved successfully');
};

/**
 * Get assigned client details with IDOR protection (Employee Only)
 */
export const getClientDetails = async (req: AuthRequest, res: Response): Promise<Response> => {
  const clientId = req.params.client_id || req.params.id;
  const clientDetails = await EmployeeService.getClientDetails(req.user!, clientId);
  return sendSuccess(res, clientDetails, 200, 'Client details retrieved successfully');
};

export default {
  getMyClients,
  getClientDetails
};
