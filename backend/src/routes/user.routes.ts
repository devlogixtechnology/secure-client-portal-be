import { Router } from 'express';
import {
  createEmployee,
  createClient,
  listUsers,
  getUserById,
  updateUser,
  deactivateUser,
  reactivateUser,
  sendClientCredentials
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '../models/User';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

// Protect all admin user routes with JWT authentication and Admin role guard (NFR-1.3.1, NFR-1.3.5)
router.use(catchAsync(authenticate), requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN));

/**
 * @route   POST /admin/users/employees
 * @desc    Create an employee account with domain validation
 * @access  Admin only
 */
router.post('/employees', catchAsync(createEmployee));

/**
 * @route   POST /admin/users/clients
 * @desc    Create a client account with business profile
 * @access  Admin only
 */
router.post('/clients', catchAsync(createClient));

/**
 * @route   GET /admin/users
 * @desc    List all users with pagination and filters
 * @access  Admin only
 */
router.get('/', catchAsync(listUsers));

/**
 * @route   GET /admin/users/:user_id
 * @desc    Get user details
 * @access  Admin only
 */
router.get('/:user_id', catchAsync(getUserById));

/**
 * @route   PATCH /admin/users/:user_id
 * @desc    Update user details
 * @access  Admin only
 */
router.patch('/:user_id', catchAsync(updateUser));

/**
 * @route   POST /admin/users/:user_id/deactivate
 * @desc    Deactivate user account (soft delete)
 * @access  Admin only
 */
router.post('/:user_id/deactivate', catchAsync(deactivateUser));

/**
 * @route   POST /admin/users/:user_id/reactivate
 * @desc    Reactivate user account
 * @access  Admin only
 */
router.post('/:user_id/reactivate', catchAsync(reactivateUser));

/**
 * @route   POST /admin/users/:user_id/send-credentials
 * @desc    Trigger/mark client login credentials sent
 * @access  Admin only
 */
router.post('/:user_id/send-credentials', catchAsync(sendClientCredentials));

export default router;
