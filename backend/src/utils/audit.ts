import { Request } from 'express';
import mongoose from 'mongoose';
import AuditLog, { AuthorizationResult } from '../models/AuditLog';
import { UserRole } from '../models/User';
import logger from './logger';

export interface IAuditLogParams {
  req?: Request;
  actorId?: mongoose.Types.ObjectId | string;
  actorType: UserRole | string;
  tenantId?: mongoose.Types.ObjectId | string;
  targetObjectId?: mongoose.Types.ObjectId | string;
  targetObjectType?: string;
  action: string;
  previousValue?: any;
  newValue?: any;
  authorizationResult?: AuthorizationResult | 'ALLOWED' | 'DENIED';
  service?: string;
}

/**
 * Record immutable audit log entry (SRS Section 3.9, NFR-1.6.1, NFR-1.6.2)
 */
export const writeAuditLog = async (params: IAuditLogParams): Promise<void> => {
  try {
    const {
      req,
      actorId,
      actorType,
      tenantId,
      targetObjectId,
      targetObjectType,
      action,
      previousValue,
      newValue,
      authorizationResult = AuthorizationResult.ALLOWED,
      service = 'client-portal-api'
    } = params;

    const sourceIp = req ? (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip : undefined;
    const userAgent = req ? req.get('user-agent') : undefined;
    const requestId = req ? (req.headers['x-request-id'] as string) : undefined;

    await AuditLog.create({
      actorId: actorId ? new mongoose.Types.ObjectId(actorId.toString()) : undefined,
      actorType: actorType as UserRole,
      tenantId: tenantId ? new mongoose.Types.ObjectId(tenantId.toString()) : undefined,
      targetObjectId: targetObjectId ? new mongoose.Types.ObjectId(targetObjectId.toString()) : undefined,
      targetObjectType,
      action,
      previousValue,
      newValue,
      authorizationResult: authorizationResult as AuthorizationResult,
      requestId,
      sourceIp,
      userAgent,
      timestamp: new Date(),
      service
    });
  } catch (err) {
    logger.error('Failed to write audit log:', err);
  }
};

export default {
  writeAuditLog
};
