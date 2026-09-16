import { Router } from 'express';
import { getMyProfile, updateMyProfile } from '../controllers/client.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '../models/User';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

// Protect client profile routes for authenticated CLIENT only (FR-3.6, NFR-1.3.1)
router.use(catchAsync(authenticate), requireRole(UserRole.CLIENT));

/**
 * @route   GET /client/profile or /clients/profile
 * @desc    Get logged in client's own profile and assigned RM
 * @access  Client only
 */
router.get('/profile', catchAsync(getMyProfile));

/**
 * @route   PATCH /client/profile or /clients/profile
 * @desc    Update logged in client's profile details
 * @access  Client only
 */
router.patch('/profile', catchAsync(updateMyProfile));

export default router;
