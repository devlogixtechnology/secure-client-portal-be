import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface IConfig {
  env: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  port: number;
  apiVersion: string;
  mongo: {
    uri: string;
    dbName: string;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  jwt: {
    secret: string;
    expiry: string;
    refreshTokenSecret: string;
    refreshTokenExpiry: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    authMaxRequests: number;
    authWindowMs: number;
  };
  logging: {
    level: string;
    filePath: string;
  };
}

export const config: IConfig = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/client_portal',
    dbName: process.env.MONGODB_DB_NAME || 'client_portal'
  },
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'default-refresh-token-secret-key',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10),
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '60000', 10)
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs'
  }
};

export default config;
