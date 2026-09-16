import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import AssignmentService from '../services/assignment.service';
import { sendSuccess, sendCreated } from '../utils/response';
import AppError from '../utils/AppError';

/**
 * Assign Client to Employee (Admin Only)
 */
export const assignClient = async (req: AuthRequest, res: Response): Promise<Response> => {
  const { employeeId, clientId, employee_id, client_id } = req.body;
  const empId = employeeId || employee_id;
  const cId = clientId || client_id;

  if (!empId || !cId) {
    throw AppError.unprocessable('Both employeeId and clientId are required', 'VALIDATION_ERROR');
  }

  const result = await AssignmentService.assignClient(empId, cId, req.user!, req);
  return sendCreated(res, result, 'Client successfully assigned to employee');
};

/**
 * Reassign Client to Different Employee (Admin Only)
 */
export const reassignClient = async (req: AuthRequest, res: Response): Promise<Response> => {
  const { clientId, client_id, newEmployeeId, new_employee_id, employeeId } = req.body;
  const cId = clientId || client_id;
  const newEmpId = newEmployeeId || new_employee_id || employeeId;

  if (!cId || !newEmpId) {
    throw AppError.unprocessable('Both clientId and newEmployeeId are required', 'VALIDATION_ERROR');
  }

  const result = await AssignmentService.reassignClient(cId, newEmpId, req.user!, req);
  return sendSuccess(res, result, 200, 'Client successfully reassigned to new employee');
};

/**
 * List Employee Assignments (Admin Only)
 */
export const listAssignments = async (req: AuthRequest, res: Response): Promise<Response> => {
  const { assignments, meta } = await AssignmentService.listAssignments(req.query);
  return sendSuccess(res, assignments, 200, 'Assignments retrieved successfully', meta);
};

/**
 * Remove Client Assignment (Admin Only)
 */
export const removeAssignment = async (req: AuthRequest, res: Response): Promise<Response> => {
  const clientId = req.params.client_id || req.params.id;
  await AssignmentService.removeAssignment(clientId, req.user!, req);
  return sendSuccess(res, { clientId, status: 'UNASSIGNED' }, 200, 'Client assignment removed successfully');
};

export default {
  assignClient,
  reassignClient,
  listAssignments,
  removeAssignment
};
