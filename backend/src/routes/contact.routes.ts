import { Router } from 'express';
import { submitContact } from '../controllers/contact.controller';
import { contactFormRateLimiter } from '../middleware/rateLimit.middleware';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

/**
 * @route   POST /public/contact
 * @desc    Submit marketing contact form
 * @access  Public
 */
router.post('/contact', contactFormRateLimiter, catchAsync(submitContact));

export default router;
