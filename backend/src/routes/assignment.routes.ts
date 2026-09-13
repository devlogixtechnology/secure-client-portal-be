
import { Router } from 'express';
import authenticate from '../middleware/auth.middleware';
import requireRole from '../middleware/rbac.middleware';
import { UserRole } from '../models/User';
import { assignClient } from '../controllers/user.controller';

const router = Router();
router.use(authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN));
router.post('/', assignClient);

export default router;