import mongoose, { Schema, Document, Model } from 'mongoose';

export enum ThreadType {
  ADMIN_CLIENT = 'ADMIN_CLIENT',
  ADMIN_EMPLOYEE = 'ADMIN_EMPLOYEE',
  EMPLOYEE_CLIENT = 'EMPLOYEE_CLIENT'
}

export interface IChatThread extends Document {
  participant1Id: mongoose.Types.ObjectId;
  participant2Id: mongoose.Types.ObjectId;
  threadType: ThreadType;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const ChatThreadSchema: Schema = new Schema(
  {
    participant1Id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    participant2Id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    threadType: {
      type: String,
      enum: Object.values(ThreadType),
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ChatThreadSchema.index({ participant1Id: 1, participant2Id: 1 }, { unique: true });
ChatThreadSchema.index({ threadType: 1 });
ChatThreadSchema.index({ updatedAt: 1 });

const ChatThread: Model<IChatThread> = mongoose.model<IChatThread>('ChatThread', ChatThreadSchema);

export default ChatThread;