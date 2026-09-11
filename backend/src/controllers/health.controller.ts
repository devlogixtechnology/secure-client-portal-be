import { Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database';
import { sendSuccess } from '../utils/response';
import config from '../config';

/**
 * Health check controller
 * Checks database connection, memory, uptime, and system status
 */
export const getHealth = async (_req: Request, res: Response): Promise<Response> => {
  const dbStatus = getDatabaseStatus();
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  const healthData = {
    service: 'Albroe Client Portal API',
    status: dbStatus.isConnected ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    environment: config.env,
    uptime: `${Math.floor(uptime)} seconds`,
    database: {
      status: dbStatus.status,
      connected: dbStatus.isConnected
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`
      }
    }
  };

  const statusCode = dbStatus.isConnected ? 200 : 503;
  return sendSuccess(res, healthData, statusCode, 'Service health check passed');
};

export default {
  getHealth
};
