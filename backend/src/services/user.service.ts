import mongoose from 'mongoose';
import { Request } from 'express';
import User, { IUser, UserRole, UserStatus } from '../models/User';
import ClientProfile, { IClientProfile } from '../models/ClientProfile';
import EmployeeAssignment from '../models/EmployeeAssignment';
import { hashPassword } from '../utils/password';
import { writeAuditLog } from '../utils/audit';
import AppError from '../utils/AppError';

const EMPLOYEE_DOMAIN_REGEX = /^[a-zA-Z0-9._%+-]+@albroeaccountants\.com$/;

export interface ICreateEmployeeDTO {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
}

export interface ICreateClientDTO {
  email: string;
  password: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  assignedEmployeeId?: string;
}

export interface IListUsersQuery {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class UserService {
  /**
   * Create Employee Account (Admin Only) with strict domain validation (FR-9.1, FR-9.2, FR-9.3)
   */
  public static async createEmployee(
    data: ICreateEmployeeDTO,
    adminUser: IUser,
    req?: Request
  ): Promise<{ id: string; email: string; firstName?: string; lastName?: string; role: string; status: string; createdAt: Date }> {
    const { email, password, firstName, lastName, status = UserStatus.ACTIVE } = data;

    if (!email || !password) {
      throw AppError.unprocessable('Email and password are required', 'VALIDATION_ERROR');
    }

    if (password.length < 12) {
      throw AppError.unprocessable('Password must be at least 12 characters long', 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Server-side employee domain validation (FR-9.1, FR-9.2, Section 3.9)
    if (!EMPLOYEE_DOMAIN_REGEX.test(normalizedEmail)) {
      if (req) {
        await writeAuditLog({
          req,
          actorId: adminUser._id,
          actorType: adminUser.role,
          action: 'admin.employee.create',
          authorizationResult: 'DENIED',
          newValue: { attemptedEmail: normalizedEmail, reason: 'domain_restricted' }
        });
      }
      throw new AppError(
        'Employee account creation failed: Email must belong to @albroeaccountants.com',
        422,
        'DOMAIN_RESTRICTED',
        { email: 'Email must belong to @albroeaccountants.com domain' }
      );
    }

    // Check unique email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (req) {
        await writeAuditLog({
          req,
          actorId: adminUser._id,
          actorType: adminUser.role,
          action: 'admin.employee.create',
          authorizationResult: 'DENIED',
          newValue: { attemptedEmail: normalizedEmail, reason: 'email_exists' }
        });
      }
      throw AppError.conflict('An account with this email address already exists', 'EMAIL_EXISTS');
    }

    const hashedPassword = await hashPassword(password);
    const employee = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      status,
      firstName: firstName?.trim(),
      lastName: lastName?.trim()
    });

    if (req) {
      await writeAuditLog({
        req,
        actorId: adminUser._id,
        actorType: adminUser.role,
        targetObjectId: employee._id,
        targetObjectType: 'User',
        action: 'admin.employee.create',
        authorizationResult: 'ALLOWED',
        newValue: { email: employee.email, role: employee.role, status: employee.status }
      });
    }

    return {
      id: employee._id.toString(),
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      status: employee.status,
      createdAt: employee.createdAt
    };
  }

  /**
   * Create Client Account (Admin Only) with Business Profile (FR-1.2, FR-1.4)
   */
  public static async createClient(
    data: ICreateClientDTO,
    adminUser: IUser,
    req?: Request
  ): Promise<{
    id: string;
    email: string;
    businessName: string;
    contactPerson: string;
    phone: string;
    role: string;
    status: string;
    assignedEmployeeId?: string | null;
    credentialsSent: boolean;
    createdAt: Date;
  }> {
    const { email, password, businessName, contactPerson, phone, assignedEmployeeId } = data;

    if (!email || !password || !businessName || !contactPerson || !phone) {
      throw AppError.unprocessable(
        'Email, password, businessName, contactPerson, and phone are all required',
        'VALIDATION_ERROR'
      );
    }

    if (password.length < 12) {
      throw AppError.unprocessable('Password must be at least 12 characters long', 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check unique email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw AppError.conflict('An account with this email address already exists', 'EMAIL_EXISTS');
    }

    let assignedEmpObjectId: mongoose.Types.ObjectId | undefined;
    if (assignedEmployeeId) {
      const employee = await User.findOne({ _id: assignedEmployeeId, role: { $in: [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.SUPER_ADMIN] } });
      if (!employee) {
        throw AppError.notFound('Assigned employee does not exist', 'EMPLOYEE_NOT_FOUND');
      }
      assignedEmpObjectId = new mongoose.Types.ObjectId(assignedEmployeeId);
    }

    // FR-1.4: Client status stays INACTIVE until an Employee is assigned, or ACTIVE if assigned during creation
    const initialStatus = assignedEmpObjectId ? UserStatus.ACTIVE : UserStatus.INACTIVE;

    const hashedPassword = await hashPassword(password);
    const client = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role: UserRole.CLIENT,
      status: initialStatus
    });

    const clientProfile = await ClientProfile.create({
      userId: client._id,
      businessName: businessName.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      assignedEmployeeId: assignedEmpObjectId || undefined,
      credentialsSent: false
    });

    if (assignedEmpObjectId) {
      await EmployeeAssignment.create({
        employeeId: assignedEmpObjectId,
        clientId: client._id,
        assignedBy: adminUser._id,
        assignedAt: new Date(),
        isActive: true
      });
    }

    if (req) {
      await writeAuditLog({
        req,
        actorId: adminUser._id,
        actorType: adminUser.role,
        tenantId: client._id,
        targetObjectId: client._id,
        targetObjectType: 'User',
        action: 'admin.client.create',
        authorizationResult: 'ALLOWED',
        newValue: {
          email: client.email,
          businessName: clientProfile.businessName,
          status: client.status,
          assignedEmployeeId: assignedEmpObjectId
        }
      });
    }

    return {
      id: client._id.toString(),
      email: client.email,
      businessName: clientProfile.businessName,
      contactPerson: clientProfile.contactPerson,
      phone: clientProfile.phone,
      role: client.role,
      status: client.status,
      assignedEmployeeId: clientProfile.assignedEmployeeId ? clientProfile.assignedEmployeeId.toString() : null,
      credentialsSent: clientProfile.credentialsSent,
      createdAt: client.createdAt
    };
  }

  /**
   * List all users with pagination, role, status, and search filters (Admin Only)
   */
  public static async listUsers(query: IListUsersQuery): Promise<{ users: any[]; meta: any }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.role) {
      filter.role = query.role.toUpperCase();
    }

    if (query.status) {
      filter.status = query.status.toUpperCase();
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex }
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('-password -passwordResetTokenHash -passwordResetExpiresAt -mfaSecret -recoveryCodes')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    // Fetch Client Profiles for clients
    const clientUserIds = users.filter((u) => u.role === UserRole.CLIENT).map((u) => u._id);
    const clientProfiles = await ClientProfile.find({ userId: { $in: clientUserIds } })
      .populate('assignedEmployeeId', 'email firstName lastName')
      .lean();

    const profileMap = new Map<string, any>();
    clientProfiles.forEach((p) => {
      profileMap.set(p.userId.toString(), p);
    });

    const enrichedUsers = users.map((u) => {
      const p = profileMap.get(u._id.toString());
      if (p) {
        return {
          id: u._id,
          email: u.email,
          role: u.role,
          status: u.status,
          businessName: p.businessName,
          contactPerson: p.contactPerson,
          phone: p.phone,
          assignedEmployee: p.assignedEmployeeId,
          credentialsSent: p.credentialsSent,
          createdAt: u.createdAt
        };
      }
      return {
        id: u._id,
        email: u.email,
        role: u.role,
        status: u.status,
        firstName: u.firstName,
        lastName: u.lastName,
        createdAt: u.createdAt
      };
    });

    return {
      users: enrichedUsers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get user details by ID (Admin Only)
   */
  public static async getUserById(userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw AppError.badRequest('Invalid user ID format', 'INVALID_ID');
    }

    const user = await User.findById(userId)
      .select('-password -passwordResetTokenHash -passwordResetExpiresAt -mfaSecret -recoveryCodes')
      .lean();

    if (!user) {
      throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

    if (user.role === UserRole.CLIENT) {
      const profile = await ClientProfile.findOne({ userId: user._id })
        .populate('assignedEmployeeId', 'email firstName lastName role status')
        .lean();

      return {
        ...user,
        id: user._id,
        profile: profile || null
      };
    }

    if (user.role === UserRole.EMPLOYEE) {
      const assignedCount = await ClientProfile.countDocuments({ assignedEmployeeId: user._id });
      return {
        ...user,
        id: user._id,
        assignedClientsCount: assignedCount
      };
    }

    return {
      ...user,
      id: user._id
    };
  }

  /**
   * Update user details (Admin Only)
   */
  public static async updateUser(
    userId: string,
    updateData: any,
    adminUser: IUser,
    req?: Request
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw AppError.badRequest('Invalid user ID format', 'INVALID_ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

    const previousValue = { firstName: user.firstName, lastName: user.lastName, status: user.status };

    if (updateData.firstName !== undefined) user.firstName = updateData.firstName.trim();
    if (updateData.lastName !== undefined) user.lastName = updateData.lastName.trim();

    await user.save();

    let profile: IClientProfile | null = null;
    if (user.role === UserRole.CLIENT) {
      profile = await ClientProfile.findOne({ userId: user._id });
      if (profile) {
        if (updateData.businessName) profile.businessName = updateData.businessName.trim();
        if (updateData.contactPerson) profile.contactPerson = updateData.contactPerson.trim();
        if (updateData.phone) profile.phone = updateData.phone.trim();
        await profile.save();
      }
    }

    if (req) {
      await writeAuditLog({
        req,
        actorId: adminUser._id,
        actorType: adminUser.role,
        targetObjectId: user._id,
        targetObjectType: 'User',
        action: 'admin.user.update',
        previousValue,
        newValue: { firstName: user.firstName, lastName: user.lastName },
        authorizationResult: 'ALLOWED'
      });
    }

    return {
      id: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      profile: profile || undefined,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Deactivate User (Soft Delete per FR-1.6: disables authentication, preserves audit & records)
   */
  public static async deactivateUser(userId: string, adminUser: IUser, req?: Request): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw AppError.badRequest('Invalid user ID format', 'INVALID_ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

    if (user._id.toString() === adminUser._id.toString()) {
      throw AppError.badRequest('Administrators cannot deactivate their own account', 'CANNOT_DEACTIVATE_SELF');
    }

    const previousStatus = user.status;
    user.status = UserStatus.INACTIVE;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all active sessions
    await user.save();

    // If client, deactivate active assignment and unassign per FR-1.6.1/FR-1.6.2
    if (user.role === UserRole.CLIENT) {
      await EmployeeAssignment.updateMany(
        { clientId: user._id, isActive: true },
        { isActive: false, unassignedAt: new Date() }
      );
      await ClientProfile.updateOne({ userId: user._id }, { $unset: { assignedEmployeeId: 1 } });
    }

    // If employee, reassign or unassign all their active client assignments
    if (user.role === UserRole.EMPLOYEE) {
      await EmployeeAssignment.updateMany(
        { employeeId: user._id, isActive: true },
        { isActive: false, unassignedAt: new Date() }
      );
      await ClientProfile.updateMany(
        { assignedEmployeeId: user._id },
        { $unset: { assignedEmployeeId: 1 } }
      );
    }

    if (req) {
      await writeAuditLog({
        req,
        actorId: adminUser._id,
        actorType: adminUser.role,
        targetObjectId: user._id,
        targetObjectType: 'User',
        action: 'admin.user.deactivate',
        previousValue: { status: previousStatus },
        newValue: { status: UserStatus.INACTIVE },
        authorizationResult: 'ALLOWED'
      });
    }
  }

  /**
   * Reactivate User (FR-1.7: restores role & permissions)
   */
  public static async reactivateUser(userId: string, adminUser: IUser, req?: Request): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw AppError.badRequest('Invalid user ID format', 'INVALID_ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

    const previousStatus = user.status;
    user.status = UserStatus.ACTIVE;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    if (req) {
      await writeAuditLog({
        req,
        actorId: adminUser._id,
        actorType: adminUser.role,
        targetObjectId: user._id,
        targetObjectType: 'User',
        action: 'admin.user.reactivate',
        previousValue: { status: previousStatus },
        newValue: { status: UserStatus.ACTIVE },
        authorizationResult: 'ALLOWED'
      });
    }
  }

  /**
   * Send / mark client credentials sent (FR-8.2.1)
   */
  public static async sendClientCredentials(userId: string, adminUser: IUser, req?: Request): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw AppError.badRequest('Invalid user ID format', 'INVALID_ID');
    }

    const user = await User.findOne({ _id: userId, role: UserRole.CLIENT });
    if (!user) {
      throw AppError.notFound('Client user not found', 'CLIENT_NOT_FOUND');
    }

    const profile = await ClientProfile.findOne({ userId: user._id });
    if (!profile) {
      throw AppError.notFound('Client profile not found', 'PROFILE_NOT_FOUND');
    }

    profile.credentialsSent = true;
    profile.credentialsSentAt = new Date();
    await profile.save();

    if (req) {
      await writeAuditLog({
        req,
        actorId: adminUser._id,
        actorType: adminUser.role,
        targetObjectId: user._id,
        targetObjectType: 'User',
        action: 'admin.client.send_credentials',
        authorizationResult: 'ALLOWED'
      });
    }
  }
}

export default UserService;
