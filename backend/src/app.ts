import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { connectDatabase } from './database/connection';
import assignmentRoutes from './routes/assignment.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

dotenv.config();

const app = express();
const apiRouter = express.Router();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) || true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/assignments', assignmentRoutes);
app.use('/v1', apiRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled application error:', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

const start = async (): Promise<void> => {
  await connectDatabase();
  app.listen(port, () => {
    console.log(`Client portal API listening on port ${port}`);
  });
};

if (require.main === module) {
  start().catch((error: unknown) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default app;
