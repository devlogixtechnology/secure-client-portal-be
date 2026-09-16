import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClientProfile extends Document {
  userId: mongoose.Types.ObjectId;
  businessName: string;
  contactPerson: string;
  phone: string;
  assignedEmployeeId?: mongoose.Types.ObjectId;
  credentialsSent: boolean;
  credentialsSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ClientProfileSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    businessName: {
      type: String,
      required: true,
      trim: true
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true
    },
    assignedEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    credentialsSent: {
      type: Boolean,
      default: false
    },
    credentialsSentAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ClientProfileSchema.index({ assignedEmployeeId: 1 });
ClientProfileSchema.index({ businessName: 1 });

const ClientProfile: Model<IClientProfile> = mongoose.model<IClientProfile>('ClientProfile', ClientProfileSchema);

export default ClientProfile;