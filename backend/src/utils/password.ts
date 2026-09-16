import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

/**
 * Hash password using Argon2id per NIST 800-63B & SRS NFR-1.1.4
 */
export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1
  });
};

/**
 * Compare candidate password against stored hash (supports both Argon2id and bcrypt for compatibility)
 */
export const comparePassword = async (candidate: string, hash: string): Promise<boolean> => {
  if (!hash) return false;
  try {
    if (hash.startsWith('$argon2')) {
      return await argon2.verify(hash, candidate);
    }
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
      return bcrypt.compareSync(candidate, hash);
    }
    return false;
  } catch {
    return false;
  }
};

export default {
  hashPassword,
  comparePassword
};
