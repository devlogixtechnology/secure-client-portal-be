import rateLimit from 'express-rate-limit';

/**
 * Authentication Rate Limiter (5 requests per minute per IP per README line 287 & SRS NFR-1.1.3)
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.'
    }
  }
});

/**
 * Password Reset Rate Limiter (3 requests per hour per email/IP per README line 344)
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests. Please try again later.'
    }
  }
});

/**
 * Public Contact Form Rate Limiter (5 requests per minute per IP)
 */
export const contactFormRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many contact submissions. Please try again later.'
    }
  }
});

export default {
  authRateLimiter,
  passwordResetRateLimiter,
  contactFormRateLimiter
};
