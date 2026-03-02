import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { validateCredentials } from '@/lib/auth';
import type { Role } from '@/lib/user-types';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

declare module 'next-auth' {
  interface Session {
    user: { id: string; email: string; role: Role };
  }
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return validateCredentials(credentials.email, credentials.password);
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: Role }).role = token.role as Role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: getNextAuthSecret(),
});

export { handler as GET, handler as POST };
