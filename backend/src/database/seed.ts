import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, ClientProfile, EmployeeAssignment } from '../models';

dotenv.config();

/**
 * Seed database with initial data
 * This creates a SUPER_ADMIN user for initial setup
 */
export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Starting database seeding...');

    // Check if SUPER_ADMIN already exists
    const existingAdmin = await User.findOne({ email: 'admin@albroeaccountants.com' });
    if (existingAdmin) {
      console.log('⚠️  SUPER_ADMIN user already exists, skipping seed');
      return;
    }

    // Create SUPER_ADMIN user
    const hashedPassword = bcrypt.hashSync('Admin@123456', 10);
    const superAdmin = new User({
      email: 'admin@albroeaccountants.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      firstName: 'Super',
      lastName: 'Admin',
      mfaEnabled: false
    });

    await superAdmin.save();
    console.log('✅ SUPER_ADMIN user created successfully');
    console.log('📧 Email: admin@albroeaccountants.com');
    console.log('🔑 Password: Admin@123456');
    console.log('⚠️  Please change the password after first login!');

    // Create a sample ADMIN user
    const adminPassword = bcrypt.hashSync('Admin@123456', 10);
    const admin = new User({
      email: 'admin2@albroeaccountants.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      firstName: 'Admin',
      lastName: 'User',
      mfaEnabled: false
    });

    await admin.save();
    console.log('✅ ADMIN user created successfully');

    // Create a sample EMPLOYEE user
    const employeePassword = bcrypt.hashSync('Employee@123456', 10);
    const employee = new User({
      email: 'employee@albroeaccountants.com',
      password: employeePassword,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      firstName: 'Jane',
      lastName: 'Smith',
      mfaEnabled: false
    });

    await employee.save();
    console.log('✅ EMPLOYEE user created successfully');

    // Create a sample CLIENT user
    const clientPassword = bcrypt.hashSync('Client@123456', 10);
    const client = new User({
      email: 'client@example.com',
      password: clientPassword,
      role: 'CLIENT',
      status: 'ACTIVE',
      firstName: 'John',
      lastName: 'Doe',
      mfaEnabled: false
    });

    await client.save();
    console.log('✅ CLIENT user created successfully');

    // Create Client Profile for the sample client
    const clientProfile = new ClientProfile({
      userId: client._id,
      businessName: 'Acme Corporation',
      contactPerson: 'John Doe',
      phone: '+1234567890',
      assignedEmployeeId: employee._id,
      credentialsSent: false
    });

    await clientProfile.save();
    console.log('✅ Client profile created successfully');

    // Create Employee Assignment
    const assignment = new EmployeeAssignment({
      employeeId: employee._id,
      clientId: client._id,
      assignedBy: superAdmin._id,
      isActive: true
    });

    await assignment.save();
    console.log('✅ Employee assignment created successfully');

    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/client_portal';
  const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'client_portal';

  mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME })
    .then(() => {
      console.log('✅ Connected to MongoDB for seeding');
      return seedDatabase();
    })
    .then(() => {
      console.log('✅ Seeding completed, disconnecting...');
      return mongoose.disconnect();
    })
    .then(() => {
      console.log('✅ Disconnected from MongoDB');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seedDatabase;