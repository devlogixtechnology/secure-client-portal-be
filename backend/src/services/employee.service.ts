import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import ClientProfile from '../models/ClientProfile';
import AppError from '../utils/AppError';

export class EmployeeService {
  /**
   * List all clients assigned to the requesting Employee (FR-4.1, README Section 5.1)
   */
  public static async getMyClients(employeeUser: IUser): Promise<any[]> {
    const profiles = await ClientProfile.find({ assignedEmployeeId: employeeUser._id })
      .populate('userId', 'email role status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return profiles.map((p) => {
      const userObj = p.userId as any;
      return {
        id: userObj?._id,
        email: userObj?.email,
        businessName: p.businessName,
        contactPerson: p.contactPerson,
        phone: p.phone,
        status: userObj?.status,
        createdAt: userObj?.createdAt
      };
    });
  }

  /**
   * Get specific assigned client details with strict object-level authorization / IDOR prevention (NFR-1.3.2, README Section 5.2)
   */
  public static async getClientDetails(employeeUser: IUser, clientId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw AppError.badRequest('Invalid client ID format', 'INVALID_ID');
    }

    const clientUser = await User.findById(clientId).select('-password -passwordResetTokenHash -passwordResetExpiresAt -mfaSecret -recoveryCodes');
    if (!clientUser) {
      throw AppError.notFound('Client not found', 'NOT_FOUND');
    }

    const profile = await ClientProfile.findOne({
      userId: clientUser._id,
      assignedEmployeeId: employeeUser._id
    }).lean();

    // Prevent IDOR: If client is not assigned to this employee, return 404 (NFR-1.3.4)
    if (!profile) {
      throw AppError.notFound('Client not found or not assigned to you', 'NOT_FOUND');
    }

    return {
      id: clientUser._id,
      email: clientUser.email,
      businessName: profile.businessName,
      contactPerson: profile.contactPerson,
      phone: profile.phone,
      status: clientUser.status,
      createdAt: clientUser.createdAt,
      updatedAt: clientUser.updatedAt
    };
  }
}

export default EmployeeService;
