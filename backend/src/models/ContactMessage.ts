import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContactMessage extends Document {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    subject: {
      type: String,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

ContactMessageSchema.index({ email: 1, createdAt: -1 });

const ContactMessage: Model<IContactMessage> = mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);

export default ContactMessage;
