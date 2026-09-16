import { Request } from 'express';
import ContactMessage, { IContactMessage } from '../models/ContactMessage';
import AppError from '../utils/AppError';

export interface IContactFormDTO {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export class ContactService {
  /**
   * Submit Marketing Contact Form (README Section 9.1)
   */
  public static async submitContactForm(data: IContactFormDTO, req?: Request): Promise<IContactMessage> {
    const { name, email, phone, subject, message } = data;

    if (!name || !email || !message) {
      throw AppError.unprocessable('Name, email, and message are required fields', 'VALIDATION_ERROR');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw AppError.unprocessable('Please provide a valid email address', 'VALIDATION_ERROR');
    }

    const ipAddress = req ? (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip : undefined;
    const userAgent = req ? req.get('user-agent') : undefined;

    const contactEntry = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      subject: subject?.trim(),
      message: message.trim(),
      ipAddress,
      userAgent
    });

    return contactEntry;
  }
}

export default ContactService;
