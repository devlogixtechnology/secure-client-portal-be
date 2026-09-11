import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import { connectDatabase } from './config/database';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/notFound.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';
import routes from './routes';
import healthRoutes from './routes/health.routes';
import logger from './utils/logger';

// Create Express Application
export const app: Application = express();

// ==========================================
// 1. Core Security & Request Middleware
// ==========================================
app.use(helmet());

app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// 2. Logging Middleware
// ==========================================
app.use(requestLogger);

// ==========================================
// 3. Root & Health Check Endpoints
// ==========================================
app.use('/health', healthRoutes);

// ==========================================
// 4. API Routes (v1)
// ==========================================
app.use(`/${config.apiVersion}`, routes);
app.use('/api', routes);

// ==========================================
// 5. 404 & Global Error Handling Middleware
// ==========================================
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ==========================================
// 6. Server Initialization
// ==========================================
const startServer = async (): Promise<void> => {
  try {
    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Start HTTP Server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running in [${config.env}] mode on port ${config.port}`);
      logger.info(`👉 Base API: http://localhost:${config.port}/${config.apiVersion}`);
      logger.info(`👉 Health check: http://localhost:${config.port}/health`);
    });

    // 3. Graceful Shutdown Handlers
    const gracefulShutdown = (signal: string) => {
      logger.info(`🛑 ${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('🔒 HTTP server closed');
        try {
          const { disconnectDatabase } = await import('./config/database');
          await disconnectDatabase();
          logger.info('🏁 Process terminated successfully');
          process.exit(0);
        } catch (err) {
          logger.error('❌ Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force close if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('⚠️ Forcefully shutting down after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      logger.error('💥 UNHANDLED REJECTION! Shutting down...', { reason });
      gracefulShutdown('unhandledRejection');
    });

    process.on('uncaughtException', (err: Error) => {
      logger.error('💥 UNCAUGHT EXCEPTION! Shutting down...', { error: err.message, stack: err.stack });
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
};

// Start server if not running in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
