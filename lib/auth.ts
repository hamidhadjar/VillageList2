import bcrypt from 'bcryptjs';
import { getUserWithPasswordByEmail } from './users-store';
import type { Role } from './user-types';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<{ id: string; email: string; role: Role } | null> {
  const user = getUserWithPasswordByEmail(email);
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, email: user.email, role: user.role };
}
