import { IUser } from '../models/User';
import ClientProfile, { IClientProfile } from '../models/ClientProfile';
import AppError from '../utils/AppError';

export interface IUpdateClientProfileDTO {
  businessName?: string;
  contactPerson?: string;
  phone?: string;
}

export class ClientService {
  /**
   * Get Client's own profile and assigned Relationship Manager details (FR-3.3, README Section 4.1)
   */
  public static async getMyProfile(user: IUser): Promise<any> {
    const profile = await ClientProfile.findOne({ userId: user._id })
      .populate('assignedEmployeeId', 'email firstName lastName')
      .lean();

    if (!profile) {
      throw AppError.notFound('Client profile not found', 'PROFILE_NOT_FOUND');
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status
      },
      profile: {
        businessName: profile.businessName,
        contactPerson: profile.contactPerson,
        phone: profile.phone,
        assignedEmployee: profile.assignedEmployeeId || null,
        credentialsSent: profile.credentialsSent,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      }
    };
  }

  /**
   * Update Client's own profile fields (README Section 4.2)
   */
  public static async updateMyProfile(user: IUser, data: IUpdateClientProfileDTO): Promise<IClientProfile> {
    const profile = await ClientProfile.findOne({ userId: user._id });
    if (!profile) {
      throw AppError.notFound('Client profile not found', 'PROFILE_NOT_FOUND');
    }

    if (data.businessName !== undefined) profile.businessName = data.businessName.trim();
    if (data.contactPerson !== undefined) profile.contactPerson = data.contactPerson.trim();
    if (data.phone !== undefined) profile.phone = data.phone.trim();

    await profile.save();
    return profile;
  }
}

export default ClientService;
