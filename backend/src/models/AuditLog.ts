// src/models/AuditLog.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  actorType: string;
  action: string;
  targetObjectId?: string;
  outcome: 'allowed' | 'denied' | 'success' | 'failure';
  sourceIp?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  actorType: { type: String, required: true },
  action: { type: String, required: true, index: true },
  targetObjectId: { type: String },
  outcome: { type: String, required: true },
  sourceIp: { type: String },
  userAgent: { type: String },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;