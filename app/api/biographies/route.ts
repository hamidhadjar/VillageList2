import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAllBiographies, createBiography } from '@/lib/db';
import { Biography, BiographyInput, getImageUrls, normalizeImageUrl } from '@/lib/types';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

const EDIT_ROLES = ['edit', 'admin'];

export async function GET(_request: NextRequest) {
  try {
    const biographies = await getAllBiographies();
    const normalized = biographies.map((bio) => {
      const urls = getImageUrls(bio);
      return { ...bio, imageUrls: urls.length ? urls : undefined, imageUrl: urls[0] } as Biography;
    });
    return NextResponse.json(normalized);
  } catch (e) {
    return NextResponse.json({ error: 'Impossible de charger les biographies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || !EDIT_ROLES.includes(token.role as string)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as BiographyInput;
    const { name, summary, fullBio, birthDate, deathDate, title, imageUrl, imageUrls, fatherId, sonIds, brotherIds } = body;
    if (!name?.trim() || !summary?.trim() || !fullBio?.trim()) {
      return NextResponse.json(
        { error: 'Le nom, le résumé et la biographie complète sont obligatoires.' },
        { status: 400 }
      );
    }
    const urls = Array.isArray(imageUrls)
      ? imageUrls.filter((u): u is string => typeof u === 'string').map((u) => normalizeImageUrl(u.trim())).filter((u) => u.length > 0)
      : (imageUrl?.trim() ? [normalizeImageUrl(imageUrl.trim())] : []);
    const sonIdsArr = Array.isArray(sonIds) ? sonIds.filter((id): id is string => typeof id === 'string') : undefined;
    const brotherIdsArr = Array.isArray(brotherIds) ? brotherIds.filter((id): id is string => typeof id === 'string') : undefined;
    const biography = await createBiography({
      name: name.trim(),
      summary: summary.trim(),
      fullBio: fullBio.trim(),
      birthDate: birthDate?.trim() || undefined,
      deathDate: deathDate?.trim() || undefined,
      title: title?.trim() || undefined,
      imageUrl: urls[0],
      imageUrls: urls.length ? [...urls] : undefined,
      fatherId: fatherId?.trim() || undefined,
      sonIds: sonIdsArr?.length ? sonIdsArr : undefined,
      brotherIds: brotherIdsArr?.length ? brotherIdsArr : undefined,
    });
    const outUrls = getImageUrls(biography);
    return NextResponse.json({ ...biography, imageUrls: outUrls.length ? outUrls : undefined, imageUrl: outUrls[0] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('read-only') || msg.includes('EROFS') || (e instanceof Error && (e as Error & { code?: string }).code === 'EACCES')) {
      return NextResponse.json(
        { error: 'L’enregistrement des biographies est en lecture seule sur ce déploiement (ex. Vercel/Netlify). Configurez Supabase.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Impossible de créer la biographie' }, { status: 500 });
  }
}
