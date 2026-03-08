import { NextRequest, NextResponse } from 'next/server';
import { getTokenSafe } from '@/lib/auth-token';
import { getBiographyById, updateBiography, deleteBiography } from '@/lib/db';
import { logEditHistory } from '@/lib/edit-history-db';
import { Biography, getImageUrls, normalizeImageUrl, type BiographyRelation } from '@/lib/types';

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
  const token = await getTokenSafe(request);
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
  const sonIdsArr =
    body.sonIds !== undefined && Array.isArray(body.sonIds)
      ? body.sonIds.map((id) => (id != null ? String(id).trim() : '')).filter(Boolean)
      : undefined;
  const brotherIdsArr =
    body.brotherIds !== undefined && Array.isArray(body.brotherIds)
      ? body.brotherIds.map((id) => (id != null ? String(id).trim() : '')).filter(Boolean)
      : undefined;
  const toId = (x: string | number | undefined | null): string => (x == null ? '' : String(x).trim());
  try {
    const needExisting = fatherSent || sonIdsArr !== undefined;
    const existing = needExisting ? await getBiographyById(id) : null;
    const oldFatherId = existing?.fatherId != null ? toId(existing.fatherId) : undefined;

    const updated = await updateBiography(id, {
      name: body.name,
      summary: body.summary,
      fullBio: body.fullBio,
      birthDate: body.birthDate,
      deathDate: body.deathDate,
      title: body.title,
      imageUrl: urls !== undefined ? urls[0] : body.imageUrl,
      imageUrls: urls,
      fatherId: fatherSent ? (newFatherId ?? '') : undefined,
      sonIds: sonIdsArr,
      brotherIds: brotherIdsArr,
      lastEditedAt: now,
      lastEditedBy: editorEmail,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    const myIdNorm = toId(id);
    // Auto sync father ↔ son: when this bio's fatherId changes, update old/new father's son_ids
    if (oldFatherId !== (newFatherId ?? '')) {
      if (oldFatherId) {
        const oldFather = await getBiographyById(oldFatherId);
        if (oldFather) {
          const prevSons = (oldFather.sonIds ?? []).map(toId).filter((sid) => sid !== myIdNorm);
          await updateBiography(oldFatherId, { sonIds: prevSons.length ? prevSons : [] });
        }
      }
      if (newFatherId) {
        const newFather = await getBiographyById(newFatherId);
        if (newFather) {
          const existingSons = (newFather.sonIds ?? []).map(toId);
          if (!existingSons.includes(myIdNorm)) {
            await updateBiography(newFatherId, { sonIds: [...(newFather.sonIds ?? []), id] });
          }
        }
      }
    }
    // When this bio's sonIds is updated, clear fatherId on any son that was removed from the list
    if (sonIdsArr !== undefined && existing) {
      const prevSonIds = (existing.sonIds ?? []).map(toId);
      const newSonIdsSet = new Set((sonIdsArr ?? []).map(toId));
      const removedSonIds = prevSonIds.filter((sid) => sid && !newSonIdsSet.has(sid));
      for (const sonId of removedSonIds) {
        const son = await getBiographyById(sonId);
        if (son && toId(son.fatherId) === myIdNorm) {
          await updateBiography(sonId, { fatherId: '' });
        }
      }
    }
    logEditHistory({
      userEmail: editorEmail,
      userRole: (token.role as string) ?? undefined,
      action: 'update',
      entityType: 'biography',
      entityId: id,
      entityLabel: updated.name?.trim() || undefined,
    });
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
  const token = await getTokenSafe(request);
  if (!token || (token.role as string) !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const existing = await getBiographyById(id);
    const deleted = await deleteBiography(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    logEditHistory({
      userEmail: (token.email as string) ?? '',
      userRole: (token.role as string) ?? undefined,
      action: 'delete',
      entityType: 'biography',
      entityId: id,
      entityLabel: existing?.name?.trim() || undefined,
    });
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
