import { Router } from 'express';
import { getMyClients, getClientDetails } from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '../models/User';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

// Protect employee routes for authenticated EMPLOYEE only (FR-4.1, FR-4.2)
router.use(catchAsync(authenticate), requireRole(UserRole.EMPLOYEE));

/**
 * @route   GET /employee/clients
 * @desc    List all clients assigned to the requesting employee
 * @access  Employee only
 */
router.get('/clients', catchAsync(getMyClients));

/**
 * @route   GET /employee/clients/:client_id
 * @desc    Get assigned client details with IDOR protection
 * @access  Employee only
 */
router.get('/clients/:client_id', catchAsync(getClientDetails));

export default router;
