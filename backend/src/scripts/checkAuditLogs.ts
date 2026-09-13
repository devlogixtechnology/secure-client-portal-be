// src/scripts/checkAuditLogs.ts
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(20).lean();
  console.log(`Found ${logs.length} audit log entries (most recent first):`);
  logs.forEach(l => {
    console.log(`- ${l.createdAt} | action: ${l.action} | outcome: ${l.outcome} | actorType: ${l.actorType} | target: ${l.targetObjectId || 'n/a'}`);
  });
  await mongoose.disconnect();
};

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});