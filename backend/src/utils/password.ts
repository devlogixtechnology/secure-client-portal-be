// src/utils/password.ts
import argon2 from 'argon2';

export const hashPassword = (plain: string) =>
  argon2.hash(plain, { type: argon2.argon2id });

export const comparePassword = (plain: string, hash: string) =>
  argon2.verify(hash, plain);