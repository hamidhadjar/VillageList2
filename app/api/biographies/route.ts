import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAllBiographies, createBiography } from '@/lib/db';
import { BiographyInput } from '@/lib/types';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

const EDIT_ROLES = ['edit', 'admin'];

export async function GET(_request: NextRequest) {
  try {
    const biographies = await getAllBiographies();
    return NextResponse.json(biographies);
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
    const { name, summary, fullBio, birthDate, deathDate, title, imageUrl } = body;
    if (!name?.trim() || !summary?.trim() || !fullBio?.trim()) {
      return NextResponse.json(
        { error: 'Le nom, le résumé et la biographie complète sont obligatoires.' },
        { status: 400 }
      );
    }
    const biography = await createBiography({
      name: name.trim(),
      summary: summary.trim(),
      fullBio: fullBio.trim(),
      birthDate: birthDate?.trim() || undefined,
      deathDate: deathDate?.trim() || undefined,
      title: title?.trim() || undefined,
      imageUrl: imageUrl?.trim() || undefined,
    });
    return NextResponse.json(biography);
  } catch (e) {
    return NextResponse.json({ error: 'Impossible de créer la biographie' }, { status: 500 });
  }
}
