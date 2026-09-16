import { Request, Response } from 'express';
import ContactService from '../services/contact.service';
import { sendCreated } from '../utils/response';

/**
 * Submit Marketing Contact Form (Public)
 */
export const submitContact = async (req: Request, res: Response): Promise<Response> => {
  const result = await ContactService.submitContactForm(req.body, req);
  return sendCreated(res, { id: result._id, createdAt: result.createdAt }, 'Thank you for contacting us. We will get back to you shortly.');
};

export default {
  submitContact
};
