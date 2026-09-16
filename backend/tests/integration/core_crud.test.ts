import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/app';
import User, { UserRole, UserStatus } from '../../src/models/User';
import ClientProfile from '../../src/models/ClientProfile';
import EmployeeAssignment from '../../src/models/EmployeeAssignment';
import ContactMessage from '../../src/models/ContactMessage';
import { hashPassword } from '../../src/utils/password';
import { signAccessToken } from '../../src/utils/jwt';
import config from '../../src/config';

describe('Task 4: Core CRUD Integration Tests (Users, Clients, Employees, Assignments, Profiles, Contact)', () => {
  jest.setTimeout(30000);
  let adminToken: string;
  let employee1Token: string;
  let employee2Token: string;
  let clientToken: string;

  let adminUser: any;
  let employee1User: any;
  let employee2User: any;
  let clientUser: any;

  beforeAll(async () => {
    // Connect to database for integration tests
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongo.uri, { dbName: config.mongo.dbName });
    }

    // Clean up test collections
    await Promise.all([
      User.deleteMany({ email: /@test-albroe\.com$|@albroeaccountants\.com$|@external-business\.com$|@corporation\.com$/ }),
      ClientProfile.deleteMany({}),
      EmployeeAssignment.deleteMany({}),
      ContactMessage.deleteMany({})
    ]);

    const hashedPassword = await hashPassword('SecurePassword123!');

    // Create Admin User
    adminUser = await User.create({
      email: 'superadmin@albroeaccountants.com',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      firstName: 'Super',
      lastName: 'Admin'
    });
    adminToken = signAccessToken(adminUser);

    // Create Employee 1 User
    employee1User = await User.create({
      email: 'rm1@albroeaccountants.com',
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
      firstName: 'RM',
      lastName: 'One'
    });
    employee1Token = signAccessToken(employee1User);

    // Create Employee 2 User
    employee2User = await User.create({
      email: 'rm2@albroeaccountants.com',
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
      firstName: 'RM',
      lastName: 'Two'
    });
    employee2Token = signAccessToken(employee2User);

    // Create Client User
    clientUser = await User.create({
      email: 'client1@external-business.com',
      password: hashedPassword,
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE
    });
    await ClientProfile.create({
      userId: clientUser._id,
      businessName: 'Acme Global Ltd',
      contactPerson: 'Alice Smith',
      phone: '+44 20 7946 0991',
      assignedEmployeeId: employee1User._id,
      credentialsSent: false
    });
    clientToken = signAccessToken(clientUser);
  });

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: /@test-albroe\.com$|@albroeaccountants\.com$|@external-business\.com$|@corporation\.com$/ }),
      ClientProfile.deleteMany({}),
      EmployeeAssignment.deleteMany({}),
      ContactMessage.deleteMany({})
    ]);
    await mongoose.connection.close();
  });

  // ==========================================
  // 1. Employee Creation & Domain Validation
  // ==========================================
  describe('Admin Employee Management (FR-9.1, FR-9.2, FR-9.3)', () => {
    it('POST /v1/admin/users/employees - should successfully create employee with @albroeaccountants.com domain', async () => {
      const res = await request(app)
        .post('/v1/admin/users/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'john.auditor@albroeaccountants.com',
          password: 'Password123456!',
          firstName: 'John',
          lastName: 'Auditor'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe('john.auditor@albroeaccountants.com');
      expect(res.body.data.role).toBe('EMPLOYEE');
    });

    it('POST /v1/admin/users/employees - should REJECT employee creation with non-company domain (HTTP 422 DOMAIN_RESTRICTED)', async () => {
      const res = await request(app)
        .post('/v1/admin/users/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'hacker@gmail.com',
          password: 'Password123456!',
          firstName: 'Hacker',
          lastName: 'Guy'
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toHaveProperty('code', 'DOMAIN_RESTRICTED');
      expect(res.body.error.message).toContain('@albroeaccountants.com');
    });
  });

  // ==========================================
  // 2. Client Creation & Account State (FR-1.4)
  // ==========================================
  describe('Admin Client Management & Inactive State (FR-1.4)', () => {
    let createdUnassignedClientId: string;

    it('POST /v1/admin/users/clients - should create client with INACTIVE status when unassigned', async () => {
      const res = await request(app)
        .post('/v1/admin/users/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'unassigned.client@corporation.com',
          password: 'Password123456!',
          businessName: 'Starline Holdings',
          contactPerson: 'Bob Builder',
          phone: '+44 20 7123 4567'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('INACTIVE'); // FR-1.4: login withheld until RM assigned
      createdUnassignedClientId = res.body.data.id;
    });

    it('POST /v1/admin/assignments - should assign employee and activate client status (FR-1.4, FR-2.2)', async () => {
      const res = await request(app)
        .post('/v1/admin/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: employee1User._id.toString(),
          clientId: createdUnassignedClientId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);

      // Verify client user is now ACTIVE
      const updatedClient = await User.findById(createdUnassignedClientId);
      expect(updatedClient?.status).toBe(UserStatus.ACTIVE);
    });
  });

  // ==========================================
  // 3. Client Reassignment (FR-1.6.1, FR-2.3)
  // ==========================================
  describe('Client Reassignment & Immediate Revocation (FR-1.6.1)', () => {
    it('PUT /v1/admin/assignments/reassign - should reassign client and revoke old assignment', async () => {
      const res = await request(app)
        .put('/v1/admin/assignments/reassign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientId: clientUser._id.toString(),
          newEmployeeId: employee2User._id.toString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify ClientProfile points to Employee 2
      const profile = await ClientProfile.findOne({ userId: clientUser._id });
      expect(profile?.assignedEmployeeId?.toString()).toBe(employee2User._id.toString());
    });
  });

  // ==========================================
  // 4. Client Self-Profile Endpoints (FR-3.3)
  // ==========================================
  describe('Client Self-Profile Endpoints', () => {
    it('GET /v1/client/profile - should return client own profile and assigned RM', async () => {
      const res = await request(app)
        .get('/v1/client/profile')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.businessName).toBe('Acme Global Ltd');
    });

    it('PATCH /v1/client/profile - should update permitted profile fields', async () => {
      const res = await request(app)
        .patch('/v1/client/profile')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          contactPerson: 'Alice J. Smith',
          phone: '+44 20 7946 9999'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.contactPerson).toBe('Alice J. Smith');
    });
  });

  // ==========================================
  // 5. Employee Scoped Clients & IDOR Prevention (FR-4.1, NFR-1.3.2)
  // ==========================================
  describe('Employee Scoped Clients & IDOR Prevention (NFR-1.3.2)', () => {
    it('GET /v1/employee/clients - Employee 2 should see assigned client', async () => {
      const res = await request(app)
        .get('/v1/employee/clients')
        .set('Authorization', `Bearer ${employee2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const foundClient = res.body.data.find((c: any) => c.id.toString() === clientUser._id.toString());
      expect(foundClient).toBeDefined();
    });

    it('GET /v1/employee/clients/:client_id - Employee 1 should get 404 (IDOR protection) for unassigned client', async () => {
      const res = await request(app)
        .get(`/v1/employee/clients/${clientUser._id}`)
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  // ==========================================
  // 6. User Listing, Details, Deactivation & Reactivation
  // ==========================================
  describe('User CRUD, Soft Delete & Reactivate (FR-1.5, FR-1.6, FR-1.7)', () => {
    it('GET /v1/admin/users - should list users with pagination and search', async () => {
      const res = await request(app)
        .get('/v1/admin/users?role=EMPLOYEE&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('POST /v1/admin/users/:user_id/deactivate - should soft-delete user (FR-1.6)', async () => {
      const res = await request(app)
        .post(`/v1/admin/users/${clientUser._id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INACTIVE');

      const user = await User.findById(clientUser._id);
      expect(user?.status).toBe(UserStatus.INACTIVE);
    });

    it('POST /v1/admin/users/:user_id/reactivate - should reactivate user (FR-1.7)', async () => {
      const res = await request(app)
        .post(`/v1/admin/users/${clientUser._id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');

      const user = await User.findById(clientUser._id);
      expect(user?.status).toBe(UserStatus.ACTIVE);
    });
  });

  // ==========================================
  // 7. Public Marketing Contact Form (README Section 9.1)
  // ==========================================
  describe('Marketing Contact Form (Public)', () => {
    it('POST /v1/public/contact - should accept valid contact submission', async () => {
      const res = await request(app)
        .post('/v1/public/contact')
        .send({
          name: 'Sarah Connor',
          email: 'sarah@resistance.org',
          phone: '+1 555 0199',
          subject: 'Inquiry regarding Accounting Portal',
          message: 'Hello, I would like to inquire about accounting services.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
    });

    it('POST /v1/public/contact - should reject invalid contact submission (missing required fields)', async () => {
      const res = await request(app)
        .post('/v1/public/contact')
        .send({
          name: 'Anonymous'
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });
});
