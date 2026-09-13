// src/utils/audit.ts
import { Request } from 'express';
import AuditLog from '../models/AuditLog';

export const writeAuditLog = async (params: {
  req: Request;
  actorId?: string;
  actorType: string;
  action: string;
  targetObjectId?: string;
  outcome: 'allowed' | 'denied' | 'success' | 'failure';
  metadata?: Record<string, unknown>;
}) => {
  try {
    await AuditLog.create({
      actorId: params.actorId,
      actorType: params.actorType,
      action: params.action,
      targetObjectId: params.targetObjectId,
      outcome: params.outcome,
      sourceIp: params.req.ip,
      userAgent: params.req.headers['user-agent'],
      metadata: params.metadata
    });
  } catch (err) {
    // audit logging must never crash the request — log and move on
    console.error('Failed to write audit log:', err);
  }
};