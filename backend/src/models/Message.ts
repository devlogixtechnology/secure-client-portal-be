import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage extends Document {
  threadId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  hasAttachment: boolean;
  attachmentFileId?: mongoose.Types.ObjectId;
  createdAt: Date;
  isRead: boolean;
  readAt?: Date;
}

const MessageSchema: Schema = new Schema(
  {
    threadId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatThread',
      required: true
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    hasAttachment: {
      type: Boolean,
      default: false
    },
    attachmentFileId: {
      type: Schema.Types.ObjectId,
      unique: true,
      sparse: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
MessageSchema.index({ threadId: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ createdAt: 1 });
MessageSchema.index({ isRead: 1, createdAt: 1 });

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;