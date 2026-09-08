import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from './User';

export enum AuthorizationResult {
  ALLOWED = 'ALLOWED',
  DENIED = 'DENIED'
}

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorType: UserRole;
  tenantId?: mongoose.Types.ObjectId;
  targetObjectId?: mongoose.Types.ObjectId;
  targetObjectType?: string;
  action: string;
  previousValue?: any;
  newValue?: any;
  authorizationResult: AuthorizationResult;
  requestId?: string;
  sourceIp?: string;
  userAgent?: string;
  timestamp: Date;
  service?: string;
}

const AuditLogSchema: Schema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actorType: {
      type: String,
      enum: Object.values(UserRole),
      required: true
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    targetObjectId: {
      type: Schema.Types.ObjectId
    },
    targetObjectType: {
      type: String
    },
    action: {
      type: String,
      required: true
    },
    previousValue: {
      type: Schema.Types.Mixed
    },
    newValue: {
      type: Schema.Types.Mixed
    },
    authorizationResult: {
      type: String,
      enum: Object.values(AuthorizationResult),
      required: true
    },
    requestId: {
      type: String
    },
    sourceIp: {
      type: String
    },
    userAgent: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    service: {
      type: String
    }
  }
);

// Indexes
AuditLogSchema.index({ actorId: 1 });
AuditLogSchema.index({ tenantId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ timestamp: 1 });
AuditLogSchema.index({ authorizationResult: 1 });

const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;