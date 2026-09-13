// src/controllers/user.controller.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User';
import ClientProfile from '../models/ClientProfile';
import EmployeeAssignment from '../models/EmployeeAssignment';
import { hashPassword } from '../utils/password';
import { writeAuditLog } from '../utils/audit';

export const createEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const normalizedEmail = email.toLowerCase();

    if (!normalizedEmail.endsWith('@albroeaccountants.com')) {
      await writeAuditLog({
        req, actorId: req.user!._id.toString(), actorType: req.user!.role,
        action: 'employee.create', outcome: 'denied', metadata: { attemptedEmail: normalizedEmail, reason: 'domain_restricted' }
      });
      return res.status(422).json({ error: { code: 'DOMAIN_RESTRICTED', message: 'Employee account creation failed: Email must belong to @albroeaccountants.com' } });
    }
    if (await User.findOne({ email: normalizedEmail })) {
      await writeAuditLog({
        req, actorId: req.user!._id.toString(), actorType: req.user!.role,
        action: 'employee.create', outcome: 'denied', metadata: { attemptedEmail: normalizedEmail, reason: 'email_exists' }
      });
      return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'Email already exists' } });
    }

    const employee = await User.create({
      email: normalizedEmail, password: await hashPassword(password), role: 'EMPLOYEE', firstName, lastName
    });

    await writeAuditLog({
      req, actorId: req.user!._id.toString(), actorType: req.user!.role,
      action: 'employee.create', targetObjectId: employee._id.toString(), outcome: 'success', metadata: { attemptedEmail: normalizedEmail }
    });

    return res.status(201).json({ success: true, data: { id: employee._id, email: employee.email, firstName, lastName, role: 'EMPLOYEE', status: 'ACTIVE', createdAt: employee.get('createdAt') } });
  } catch (err) { return next(err); }
};

export const createClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, businessName, contactPerson, phone, assignedEmployeeId } = req.body;
    const normalizedEmail = email.toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'Email already exists' } });
    }

    // FR-1.4: stays inactive until an Employee is assigned, so login is impossible in the meantime
    const client = await User.create({
      email: normalizedEmail,
      password: await hashPassword(password),
      role: 'CLIENT',
      status: assignedEmployeeId ? 'ACTIVE' : 'INACTIVE'
    });
    const profile = await ClientProfile.create({ userId: client._id, businessName, contactPerson, phone, assignedEmployeeId: assignedEmployeeId || null });

    if (assignedEmployeeId) {
      await EmployeeAssignment.create({ employeeId: assignedEmployeeId, clientId: client._id, assignedBy: req.user!._id });
      // TODO: trigger the credentials email here once SMTP is wired up (FR-8.2.1)
    }

    await writeAuditLog({
      req, actorId: req.user!._id.toString(), actorType: req.user!.role,
      action: 'client.create', targetObjectId: client._id.toString(), outcome: 'success'
    });

    return res.status(201).json({ success: true, data: { id: client._id, email: client.email, businessName: profile.businessName, contactPerson: profile.contactPerson, phone: profile.phone, role: 'CLIENT', status: client.status, assignedEmployeeId: profile.assignedEmployeeId, credentialsSent: false } });
  } catch (err) { return next(err); }
};

export const assignClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, clientId } = req.body;

    await ClientProfile.findOneAndUpdate({ userId: clientId }, { assignedEmployeeId: employeeId });
    // now that they have an Employee, they can actually log in (FR-1.4)
    await User.findByIdAndUpdate(clientId, { status: 'ACTIVE' });
    const assignment = await EmployeeAssignment.create({ employeeId, clientId, assignedBy: req.user!._id });

    await writeAuditLog({
      req, actorId: req.user!._id.toString(), actorType: req.user!.role,
      action: 'client.assign', targetObjectId: clientId, outcome: 'success', metadata: { employeeId }
    });

    return res.status(201).json({ success: true, data: { id: assignment._id, employeeId, clientId, assignedAt: assignment.assignedAt, assignedBy: req.user!._id, isActive: true } });
  } catch (err) { return next(err); }
};