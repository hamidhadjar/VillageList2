import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBiographyById, updateBiography, deleteBiography } from '@/lib/db';
import { Biography, getImageUrls, normalizeImageUrl, type BiographyRelation } from '@/lib/types';
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
    const out: Record<string, unknown> = { ...biography, imageUrls: urls.length ? urls : undefined, imageUrl: urls[0] };
    const relations: { father?: BiographyRelation; sons: BiographyRelation[]; brothers: BiographyRelation[] } = { sons: [], brothers: [] };
    if (biography.fatherId) {
      const father = await getBiographyById(biography.fatherId);
      if (father) relations.father = { id: father.id, name: father.name };
    }
    for (const sid of biography.sonIds ?? []) {
      const son = await getBiographyById(sid);
      if (son) relations.sons.push({ id: son.id, name: son.name });
    }
    for (const bid of biography.brotherIds ?? []) {
      const bro = await getBiographyById(bid);
      if (bro) relations.brothers.push({ id: bro.id, name: bro.name });
    }
    out.relations = relations;
    return NextResponse.json(out);
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
  const newFatherId = body.fatherId !== undefined ? (body.fatherId?.trim() || undefined) : undefined;
  const fatherSent = body.fatherId !== undefined;
  const urls =
    body.imageUrls !== undefined
      ? (Array.isArray(body.imageUrls) ? body.imageUrls : [])
          .filter((u): u is string => typeof u === 'string')
          .map((u) => normalizeImageUrl(u.trim()))
          .filter((u) => u.length > 0)
      : body.imageUrl !== undefined
        ? (body.imageUrl?.trim() ? [normalizeImageUrl(body.imageUrl.trim())] : [])
        : undefined;
  const sonIdsArr = body.sonIds !== undefined && Array.isArray(body.sonIds) ? body.sonIds.filter((id): id is string => typeof id === 'string') : undefined;
  const brotherIdsArr = body.brotherIds !== undefined && Array.isArray(body.brotherIds) ? body.brotherIds.filter((id): id is string => typeof id === 'string') : undefined;
  try {
    const existing = fatherSent ? await getBiographyById(id) : null;
    const oldFatherId = existing?.fatherId?.trim();

    const updated = await updateBiography(id, {
      name: body.name,
      summary: body.summary,
      fullBio: body.fullBio,
      birthDate: body.birthDate,
      deathDate: body.deathDate,
      title: body.title,
      imageUrl: urls !== undefined ? urls[0] : body.imageUrl,
      imageUrls: urls,
      fatherId: newFatherId,
      sonIds: sonIdsArr,
      brotherIds: brotherIdsArr,
      lastEditedAt: now,
      lastEditedBy: editorEmail,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    // Auto link father → son: keep father's son_ids in sync with fatherId on this bio
    if (oldFatherId !== newFatherId) {
      if (oldFatherId) {
        const oldFather = await getBiographyById(oldFatherId);
        if (oldFather) {
          const prevSons = (oldFather.sonIds ?? []).filter((sid) => sid !== id);
          await updateBiography(oldFatherId, { sonIds: prevSons.length ? prevSons : [] });
        }
      }
      if (newFatherId) {
        const newFather = await getBiographyById(newFatherId);
        if (newFather) {
          const existingSons = newFather.sonIds ?? [];
          if (!existingSons.includes(id)) {
            await updateBiography(newFatherId, { sonIds: [...existingSons, id] });
          }
        }
      }
    }
    const outUrls = getImageUrls(updated);
    return NextResponse.json({ ...updated, imageUrls: outUrls.length ? outUrls : undefined, imageUrl: outUrls[0] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('PUT /api/biographies/[id] error:', e);
    if (msg.includes('father_id') || msg.includes('son_ids') || msg.includes('brother_ids') || msg.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Les champs de lien familial (père, fils, frères) ne sont pas encore disponibles. Exécutez la migration Supabase : docs/supabase-migration-relationships.sql' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: msg.length < 200 ? msg : 'Erreur lors de l’enregistrement' },
      { status: 500 }
    );
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
