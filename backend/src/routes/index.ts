import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import assignmentRoutes from './assignment.routes';
import clientRoutes from './client.routes';
import employeeRoutes from './employee.routes';
import contactRoutes from './contact.routes';

const router = Router();

// Health Check
router.use('/health', healthRoutes);

// 1. Authentication Endpoints (/v1/auth/*)
router.use('/auth', authRoutes);

// 2. Admin User Management Endpoints (/v1/admin/users/*)
router.use('/admin/users', userRoutes);

// 3. Admin Employee Assignment Endpoints (/v1/admin/assignments/*)
router.use('/admin/assignments', assignmentRoutes);

// 4. Client Endpoints (/v1/client/* & /v1/clients/*)
router.use('/client', clientRoutes);
router.use('/clients', clientRoutes);

// 5. Employee Endpoints (/v1/employee/* & /v1/employees/*)
router.use('/employee', employeeRoutes);
router.use('/employees', employeeRoutes);

// 6. Public / Marketing Endpoints (/v1/public/*)
router.use('/public', contactRoutes);

export default router;
