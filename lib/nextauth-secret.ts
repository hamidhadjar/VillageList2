export function getNextAuthSecret(): string {
  const fromEnv = process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'development') {
    return 'dev-only-secret-change-me';
  }
  throw new Error(
    'NEXTAUTH_SECRET is required in production. Set it in .env or as an environment variable (e.g. NEXTAUTH_SECRET=your-secret npm start).'
  );
}

