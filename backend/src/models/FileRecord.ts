import mongoose, { Schema, Document, Model } from 'mongoose';

export enum UploadPurpose {
  DOCUMENT_REQUEST = 'DOCUMENT_REQUEST',
  CHAT_ATTACHMENT = 'CHAT_ATTACHMENT',
  DIRECT_UPLOAD = 'DIRECT_UPLOAD'
}

export enum VirusScanStatus {
  PENDING = 'PENDING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
  ERROR = 'ERROR'
}

export interface IFileRecord extends Document {
  clientId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  fileHash: string;
  uploadPurpose: UploadPurpose;
  associatedRequestId?: mongoose.Types.ObjectId;
  associatedMessageId?: mongoose.Types.ObjectId;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: mongoose.Types.ObjectId;
  virusScanStatus: VirusScanStatus;
  createdAt: Date;
}

const FileRecordSchema: Schema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    originalFilename: {
      type: String,
      required: true
    },
    storedFilename: {
      type: String,
      required: true,
      unique: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileHash: {
      type: String,
      required: true
    },
    uploadPurpose: {
      type: String,
      enum: Object.values(UploadPurpose),
      required: true
    },
    associatedRequestId: {
      type: Schema.Types.ObjectId,
      unique: true,
      sparse: true
    },
    associatedMessageId: {
      type: Schema.Types.ObjectId,
      unique: true,
      sparse: true
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    archivedAt: {
      type: Date
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    virusScanStatus: {
      type: String,
      enum: Object.values(VirusScanStatus),
      default: VirusScanStatus.PENDING
    }
  },
  {
    timestamps: true
  }
);

// Indexes
FileRecordSchema.index({ clientId: 1 });
FileRecordSchema.index({ uploadedBy: 1 });
FileRecordSchema.index({ uploadPurpose: 1 });
FileRecordSchema.index({ isArchived: 1 });
FileRecordSchema.index({ createdAt: 1 });

const FileRecord: Model<IFileRecord> = mongoose.model<IFileRecord>('FileRecord', FileRecordSchema);

export default FileRecord;