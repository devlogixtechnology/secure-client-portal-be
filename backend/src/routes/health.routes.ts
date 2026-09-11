import { Router } from 'express';
import { getHealth } from '../controllers/health.controller';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

/**
 * @route   GET /health
 * @desc    Get system and database health status
 * @access  Public
 */
router.get('/', catchAsync(getHealth));

export default router;
