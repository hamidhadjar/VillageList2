import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBiographyById, updateBiography, deleteBiography } from '@/lib/db';
import { Biography, getImageUrls, normalizeImageUrl } from '@/lib/types';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

const EDIT_ROLES = ['edit', 'admin'];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const biography = await getBiographyById(id);
    if (!biography) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    const urls = getImageUrls(biography);
    return NextResponse.json({ ...biography, imageUrls: urls.length ? urls : undefined, imageUrl: urls[0] });
  } catch (e) {
    return NextResponse.json({ error: 'Impossible de charger la biographie' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || !EDIT_ROLES.includes(token.role as string)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as Partial<Biography> & { imageUrl?: string | null; imageUrls?: string[] | null };
  const now = new Date().toISOString();
  const editorEmail = (token.email as string) ?? '';
  const urls =
    body.imageUrls !== undefined
      ? (Array.isArray(body.imageUrls) ? body.imageUrls : [])
          .filter((u): u is string => typeof u === 'string')
          .map((u) => normalizeImageUrl(u.trim()))
          .filter((u) => u.length > 0)
      : body.imageUrl !== undefined
        ? (body.imageUrl?.trim() ? [normalizeImageUrl(body.imageUrl.trim())] : [])
        : undefined;
  const updated = await updateBiography(id, {
    name: body.name,
    summary: body.summary,
    fullBio: body.fullBio,
    birthDate: body.birthDate,
    deathDate: body.deathDate,
    title: body.title,
    imageUrl: urls !== undefined ? urls[0] : body.imageUrl,
    imageUrls: urls,
    lastEditedAt: now,
    lastEditedBy: editorEmail,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }
  const outUrls = getImageUrls(updated);
  return NextResponse.json({ ...updated, imageUrls: outUrls.length ? outUrls : undefined, imageUrl: outUrls[0] });
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
  try {
    const deleted = await deleteBiography(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('read-only') || msg.includes('EROFS') || (e instanceof Error && (e as Error & { code?: string }).code === 'EACCES') || (e instanceof Error && (e as Error & { cause?: unknown }).cause)) {
      return NextResponse.json(
        { error: 'L’enregistrement est en lecture seule sur ce déploiement (ex. Vercel/Netlify). Configurez Supabase.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Impossible de supprimer la biographie' }, { status: 500 });
  }
}
