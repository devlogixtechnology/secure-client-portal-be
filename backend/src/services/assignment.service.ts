import mongoose from 'mongoose';
import { Request } from 'express';
import User, { IUser, UserRole, UserStatus } from '../models/User';
import ClientProfile from '../models/ClientProfile';
import EmployeeAssignment, { IEmployeeAssignment } from '../models/EmployeeAssignment';
import { writeAuditLog } from '../utils/audit';
import AppError from '../utils/AppError';

export interface IListAssignmentsQuery {
  employeeId?: string;
  clientId?: string;
  isActive?: boolean | string;
  page?: number;
  limit?: number;
}

export class AssignmentService {
  /**
   * Assign Client to Employee (Relationship Manager) (FR-2.2, FR-1.4)
   */
  public static async assignClient(
    employeeId: string,
    clientId: string,
    adminUser: IUser,
    req?: Request
  ): Promise<IEmployeeAssignment> {
    if (!mongoose.Types.ObjectId.isValid(employeeId) || !mongoose.Types.ObjectId.isValid(clientId)) {
      throw AppError.badRequest('Invalid employeeId or clientId format', 'INVALID_ID');
    }

    const [employee, client] = await Promise.all([
      User.findOne({ _id: employeeId, role: { $in: [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.SUPER_ADMIN] } }),
      User.findOne({ _id: clientId, role: UserRole.CLIENT })
    ]);

    if (!employee) {
      throw AppError.notFound('Employee not found', 'EMPLOYEE_NOT_FOUND');
    }

    if (!client) {
      throw AppError.notFound('Client not found', 'CLIENT_NOT_FOUND');
    }

    // Deactivate previous active assignments for this client
    await EmployeeAssignment.updateMany(
      { clientId: client._id, isActive: true },
      { isActive: false, unassignedAt: new Date() }
    );

    // Update Client Profile with assigned Employee ID
    await ClientProfile.findOneAndUpdate(
      { userId: client._id },
      { assignedEmployeeId: employee._id },
      { upsert: true }
    );

    // FR-1.4: Now that client has an assigned RM, their account becomes ACTIVE for login
    client.status = UserStatus.ACTIVE;
    await client.save();

    // Create new active assignment
    const assignment = await EmployeeAssignment.create({
      employeeId: employee._id,
      clientId: client._id,
      assignedBy: adminUser._id,
      assignedAt: new Date(),
      isActive: true
    });

    if (req) {
      await writeAuditLog({
        req,
        actorId: adminUser._id,
        actorType: adminUser.role,
        tenantId: client._id,
        targetObjectId: assignment._id,
        targetObjectType: 'EmployeeAssignment',
        action: 'admin.assignment.create',
        authorizationResult: 'ALLOWED',
        newValue: { employeeId: employee._id, clientId: client._id }
      });
    }

    return assignment;
  }

  /**
   * Reassign Client to a different Employee (FR-2.3, FR-1.6.1)
   */
  public static async reassignClient(
    clientId: string,
    newEmployeeId: string,
    adminUser: IUser,
    req?: Request
  ): Promise<IEmployeeAssignment> {
    if (!mongoose.Types.ObjectId.isValid(newEmployeeId) || !mongoose.Types.ObjectId.isValid(clientId)) {
      throw AppError.badRequest('Invalid employeeId or clientId format', 'INVALID_ID');
    }

    const [newEmployee, client] = await Promise.all([
      User.findOne({ _id: newEmployeeId, role: { $in: [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.SUPER_ADMIN] } }),
      User.findOne({ _id: clientId, role: UserRole.CLIENT })
    ]);

    if (!newEmployee) {
      throw AppError.notFound('New employee not found', 'EMPLOYEE_NOT_FOUND');
    }

    if (!client) {
      throw AppError.notFound('Client not found', 'CLIENT_NOT_FOUND');
    }

    // FR-1.6.1: Immediately revoke former Employee access by deactivating active assignment
    const previousActiveAssignment = await EmployeeAssignment.findOne({ clientId: client._id, isActive: true });
    if (previousActiveAssignment) {
      previousActiveAssignment.isActive = false;
      previousActiveAssignment.unassignedAt = new Date();
      await previousActiveAssignment.save();
    }

    // Update Client Profile
    await ClientProfile.findOneAndUpdate(
      { userId: client._id },
      { assignedEmployeeId: newEmployee._id },
      { upsert: true }
    );

    // Create new active assignment
    const assignment = await EmployeeAssignment.create({
      employeeId: newEmployee._id,
      clientId: client._id,
      assignedBy: adminUser._id,
      assignedAt: new Date(),
      isActive: true
    });

    if (req) {
      await writeAuditLog({
        req,
        actorId: adminUser._id,
        actorType: adminUser.role,
        tenantId: client._id,
        targetObjectId: assignment._id,
        targetObjectType: 'EmployeeAssignment',
        action: 'admin.assignment.reassign',
        authorizationResult: 'ALLOWED',
        previousValue: { formerEmployeeId: previousActiveAssignment?.employeeId },
        newValue: { newEmployeeId: newEmployee._id, clientId: client._id }
      });
    }

    return assignment;
  }

  /**
   * List all employee assignments with pagination and population (Admin Only)
   */
  public static async listAssignments(query: IListAssignmentsQuery): Promise<{ assignments: any[]; meta: any }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.employeeId && mongoose.Types.ObjectId.isValid(query.employeeId)) {
      filter.employeeId = new mongoose.Types.ObjectId(query.employeeId);
    }

    if (query.clientId && mongoose.Types.ObjectId.isValid(query.clientId)) {
      filter.clientId = new mongoose.Types.ObjectId(query.clientId);
    }

    if (query.isActive !== undefined) {
      filter.isActive = String(query.isActive) === 'true';
    }

    const [total, assignments] = await Promise.all([
      EmployeeAssignment.countDocuments(filter),
      EmployeeAssignment.find(filter)
        .populate('employeeId', 'email firstName lastName role')
        .populate('clientId', 'email role status')
        .populate('assignedBy', 'email firstName lastName')
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return {
      assignments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Remove client assignment (FR-1.6.2: unassigned client is visible only to Admin and login is withheld)
   */
  public static async removeAssignment(clientId: string, adminUser: IUser, req?: Request): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw AppError.badRequest('Invalid clientId format', 'INVALID_ID');
    }

    const client = await User.findOne({ _id: clientId, role: UserRole.CLIENT });
    if (!client) {
      throw AppError.notFound('Client not found', 'CLIENT_NOT_FOUND');
    }

    await EmployeeAssignment.updateMany(
      { clientId: client._id, isActive: true },
      { isActive: false, unassignedAt: new Date() }
    );

    await ClientProfile.updateOne(
      { userId: client._id },
      { $unset: { assignedEmployeeId: 1 } }
    );

    // FR-1.4 / FR-1.6.2: Withhold client login when unassigned
    client.status = UserStatus.INACTIVE;
    await client.save();

    if (req) {
      await writeAuditLog({
        req,
        actorId: adminUser._id,
        actorType: adminUser.role,
        tenantId: client._id,
        targetObjectId: client._id,
        targetObjectType: 'ClientProfile',
        action: 'admin.assignment.remove',
        authorizationResult: 'ALLOWED',
        newValue: { unassignedClientId: client._id }
      });
    }
  }
}

export default AssignmentService;
