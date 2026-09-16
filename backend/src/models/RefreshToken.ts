import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
  replacedByHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically cleans up expired tokens
    },
    revoked: {
      type: Boolean,
      default: false
    },
    replacedByHash: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

RefreshTokenSchema.index({ userId: 1, revoked: 1 });

const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);

export default RefreshToken;
