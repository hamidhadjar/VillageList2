import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { getNextAuthSecret } from './nextauth-secret';

/** Token shape used in API routes (role, email, id). getToken can return string in some cases; we normalize to object | null. */
export type SafeToken = { id?: string; email?: string | null; role?: string; [key: string]: unknown };

/**
 * Safely get the JWT token. Never throws: if getToken or JWT decode fails
 * (e.g. wrong secret, malformed cookie, undefined payload), returns null.
 * Returns null if token is a string (next-auth edge case). Use this in API routes.
 */
export async function getTokenSafe(
  request: NextRequest | Request
): Promise<SafeToken | null> {
  try {
    const secret = getNextAuthSecret();
    if (!secret || secret.startsWith('production-secret-not-set')) {
      return null;
    }
    const token = await getToken({
      req: request as NextRequest,
      secret,
    });
    if (!token || typeof token === 'string') return null;
    return token as SafeToken;
  } catch {
    return null;
  }
}
