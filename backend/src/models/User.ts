// src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  CLIENT = 'CLIENT'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export interface IUser extends Document {
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  recoveryCodes?: string[];
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  tokenVersion: number;
  failedLoginAttempts: number;
  lockUntil?: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 12
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    lastLogin: {
      type: Date
    },
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: {
      type: String
    },
    recoveryCodes: [{
      type: String
    }],
    passwordResetTokenHash: {
      type: String,
      select: false
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;