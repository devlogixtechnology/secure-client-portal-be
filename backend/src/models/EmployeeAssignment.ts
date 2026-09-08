import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployeeAssignment extends Document {
  employeeId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  assignedAt: Date;
  unassignedAt?: Date;
  assignedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeAssignmentSchema: Schema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    unassignedAt: {
      type: Date
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
EmployeeAssignmentSchema.index({ employeeId: 1 });
EmployeeAssignmentSchema.index({ clientId: 1 });
EmployeeAssignmentSchema.index({ isActive: 1 });
EmployeeAssignmentSchema.index({ assignedAt: 1, unassignedAt: 1 });

const EmployeeAssignment: Model<IEmployeeAssignment> = mongoose.model<IEmployeeAssignment>('EmployeeAssignment', EmployeeAssignmentSchema);

export default EmployeeAssignment;