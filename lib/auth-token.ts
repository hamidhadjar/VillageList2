import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { getNextAuthSecret } from './nextauth-secret';

/**
 * Safely get the JWT token. Never throws: if getToken or JWT decode fails
 * (e.g. wrong secret, malformed cookie, undefined payload), returns null.
 * Use this in API routes to avoid "Cannot read properties of undefined (reading 'payload')".
 */
export async function getTokenSafe(
  request: NextRequest | Request
): Promise<{ id?: string; email?: string; role?: string; [key: string]: unknown } | null> {
  try {
    const secret = getNextAuthSecret();
    if (!secret || secret.startsWith('production-secret-not-set')) {
      return null;
    }
    const token = await getToken({
      req: request as NextRequest,
      secret,
    });
    return token;
  } catch {
    return null;
  }
}
