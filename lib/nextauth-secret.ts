const PRODUCTION_PLACEHOLDER = 'production-secret-not-set-set-NEXTAUTH_SECRET';

export function getNextAuthSecret(): string {
  const fromEnv = process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'development') {
    return 'dev-only-secret-change-me';
  }
  // During `next build` and when running without NEXTAUTH_SECRET, return a placeholder
  // so the build completes and the server starts. Log so the user sets the env var.
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    console.warn(
      'NEXTAUTH_SECRET is not set. Set it in .env or as an environment variable for production (e.g. NEXTAUTH_SECRET=your-secret).'
    );
    return PRODUCTION_PLACEHOLDER;
  }
  return PRODUCTION_PLACEHOLDER;
}

