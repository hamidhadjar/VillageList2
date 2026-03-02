import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAllUsers, createUser, getUserByEmail } from '@/lib/users-store';
import { hashPassword } from '@/lib/auth';
import type { Role } from '@/lib/user-types';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || (token.role as string) !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  try {
    const users = getAllUsers();
    return NextResponse.json(users);
  } catch (e) {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || (token.role as string) !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { email, password, role } = body as { email?: string; password?: string; role?: Role };
    if (!email?.trim() || !password?.trim() || !role) {
      return NextResponse.json(
        { error: 'Email, mot de passe et rôle sont requis.' },
        { status: 400 }
      );
    }
    if (!['admin', 'edit', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (getUserByEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà.' }, { status: 400 });
    }
    const passwordHash = await hashPassword(password.trim());
    const user = createUser({
      email: normalizedEmail,
      passwordHash,
      role,
    });
    return NextResponse.json(user);
  } catch (e) {
    console.error('POST /api/users error:', e);
    const message = e instanceof Error ? e.message : 'Erreur';
    return NextResponse.json(
      { error: message.includes('EACCES') || message.includes('EPERM') ? 'Impossible d\'écrire dans data/users.json.' : 'Erreur lors de la création.' },
      { status: 500 }
    );
  }
}
