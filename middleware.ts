import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = token.role as string;

    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    if ((path === '/add' || path.startsWith('/edit/')) && (role === 'viewer')) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token }, secret: getNextAuthSecret() }
);

export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
