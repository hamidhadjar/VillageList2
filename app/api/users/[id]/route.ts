import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserById, updateUser, deleteUser, getUserByEmail } from '@/lib/users-db';
import { hashPassword } from '@/lib/auth';
import type { Role } from '@/lib/user-types';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || (token.role as string) !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || (token.role as string) !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const { email, role, password } = body as { email?: string; role?: Role; password?: string };
  const updates: { email?: string; role?: Role; passwordHash?: string } = {};
  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await getUserByEmail(normalizedEmail);
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà.' }, { status: 400 });
    }
    updates.email = normalizedEmail;
  }
  if (role !== undefined) {
    if (!['admin', 'edit', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 });
    }
    updates.role = role;
  }
  if (password !== undefined && password.trim()) {
    updates.passwordHash = await hashPassword(password.trim());
  }
  try {
    const user = await updateUser(id, updates);
    if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json(user);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('read-only') || msg.includes('EROFS') || msg.includes('EACCES')) {
      return NextResponse.json(
        { error: 'La gestion des utilisateurs est en lecture seule sur ce déploiement (ex. Netlify).' },
        { status: 503 }
      );
    }
    throw e;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || (token.role as string) !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  if (id === token.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 400 });
  }
  try {
    const ok = await deleteUser(id);
    if (!ok) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('read-only') || msg.includes('EROFS') || msg.includes('EACCES')) {
      return NextResponse.json(
        { error: 'La gestion des utilisateurs est en lecture seule sur ce déploiement (ex. Netlify).' },
        { status: 503 }
      );
    }
    throw e;
  }
}
