import { Router } from 'express';
import {
  assignClient,
  reassignClient,
  listAssignments,
  removeAssignment
} from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '../models/User';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

// Protect all assignment routes with JWT authentication and Admin role guard
router.use(catchAsync(authenticate), requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN));

/**
 * @route   POST /admin/assignments
 * @desc    Assign client to employee
 * @access  Admin only
 */
router.post('/', catchAsync(assignClient));

/**
 * @route   PUT /admin/assignments/reassign
 * @desc    Reassign client to new employee
 * @access  Admin only
 */
router.put('/reassign', catchAsync(reassignClient));

/**
 * @route   POST /admin/assignments/reassign (also supported for client versatility)
 * @desc    Reassign client to new employee
 * @access  Admin only
 */
router.post('/reassign', catchAsync(reassignClient));

/**
 * @route   GET /admin/assignments
 * @desc    List all employee assignments
 * @access  Admin only
 */
router.get('/', catchAsync(listAssignments));

/**
 * @route   DELETE /admin/assignments/:client_id
 * @desc    Remove client assignment
 * @access  Admin only
 */
router.delete('/:client_id', catchAsync(removeAssignment));

export default router;
