// src/routes/auth.routes.ts
import { Router } from 'express';
import { confirmPasswordReset, login, refresh, requestPasswordReset } from '../controllers/auth.controller';
import { loginLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware';

const router = Router();
router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/password-reset/request', passwordResetLimiter, requestPasswordReset);
router.post('/password-reset/confirm', passwordResetLimiter, confirmPasswordReset);

export default router;