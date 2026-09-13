// src/scripts/resetAdminPassword.ts
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';
import { hashPassword } from '../utils/password';

dotenv.config();

const TARGET_EMAIL = process.argv[2] || 'admin@albroeaccountants.com';
const NEW_PASSWORD = 'TestPassword123!';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);

  const user = await User.findOne({ email: TARGET_EMAIL });
  if (!user) {
    console.log('User not found');
    await mongoose.disconnect();
    return;
  }

  user.password = await hashPassword(NEW_PASSWORD);
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  console.log(`Password reset for ${user.email}. New hash prefix: ${user.password.substring(0, 15)}...`);
  await mongoose.disconnect();
};

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});