import mongoose, { Schema, Document, Model } from 'mongoose';

export enum FileRequestStatus {
  PENDING = 'PENDING',
  UNACKNOWLEDGED = 'UNACKNOWLEDGED',
  FULFILLED = 'FULFILLED',
  REJECTED = 'REJECTED'
}

export interface IFileRequest extends Document {
  clientId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  label: string;
  description?: string;
  status: FileRequestStatus;
  submittedFileId?: mongoose.Types.ObjectId;
  acknowledgedBy?: mongoose.Types.ObjectId;
  acknowledgedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FileRequestSchema: Schema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    label: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    status: {
      type: String,
      enum: Object.values(FileRequestStatus),
      default: FileRequestStatus.PENDING
    },
    submittedFileId: {
      type: Schema.Types.ObjectId,
      unique: true,
      sparse: true
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: {
      type: Date
    },
    rejectionReason: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes
FileRequestSchema.index({ clientId: 1 });
FileRequestSchema.index({ requestedBy: 1 });
FileRequestSchema.index({ status: 1 });
FileRequestSchema.index({ createdAt: 1 });

const FileRequest: Model<IFileRequest> = mongoose.model<IFileRequest>('FileRequest', FileRequestSchema);

export default FileRequest;