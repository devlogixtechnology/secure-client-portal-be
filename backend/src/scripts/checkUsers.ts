// src/scripts/checkUsers.ts
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  const users = await User.find().lean();
  console.log(JSON.stringify(users, null, 2));
  await mongoose.disconnect();
};

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});