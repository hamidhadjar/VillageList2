export function getNextAuthSecret(): string | undefined {
  const fromEnv = process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  // In local development, allow a fallback secret so auth works out-of-the-box.
  // In production, NEXTAUTH_SECRET must be set.
  if (process.env.NODE_ENV === 'development') return 'dev-only-secret-change-me';
  return undefined;
}

