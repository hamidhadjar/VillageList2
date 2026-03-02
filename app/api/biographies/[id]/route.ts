import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBiographyById, updateBiography, deleteBiography } from '@/lib/db';
import { Biography } from '@/lib/types';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

const EDIT_ROLES = ['edit', 'admin'];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const biography = await getBiographyById(id);
  if (!biography) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }
  return NextResponse.json(biography);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ secret: getNextAuthSecret() });
  if (!token || !EDIT_ROLES.includes(token.role as string)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as Partial<Biography> & { imageUrl?: string | null };
  const updated = await updateBiography(id, {
    name: body.name,
    summary: body.summary,
    fullBio: body.fullBio,
    birthDate: body.birthDate,
    deathDate: body.deathDate,
    title: body.title,
    imageUrl: body.imageUrl,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ secret: getNextAuthSecret() });
  if (!token || !EDIT_ROLES.includes(token.role as string)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  const deleted = await deleteBiography(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
