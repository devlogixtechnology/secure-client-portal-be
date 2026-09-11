import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Mount Health Check Routes on /health and /v1/health
router.use('/health', healthRoutes);

// Note: Future route modules (auth, users, files, requests, chat, audit) will be registered here.
// e.g.:
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/files', fileRoutes);
// router.use('/requests', requestRoutes);
// router.use('/chat', chatRoutes);
// router.use('/audit', auditRoutes);

export default router;
