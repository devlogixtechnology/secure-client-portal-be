// src/models/RefreshToken.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  revoked: boolean;
  replacedByHash?: string;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshTokenSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  revoked: { type: Boolean, default: false },
  replacedByHash: { type: String },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
export default RefreshToken;