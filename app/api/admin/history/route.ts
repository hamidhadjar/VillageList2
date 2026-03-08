import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAllEditHistory } from '@/lib/edit-history-db';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || (token.role as string) !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 200, 500);
    const entries = await getAllEditHistory(limit);
    return NextResponse.json(entries);
  } catch (e) {
    return NextResponse.json({ error: 'Impossible de charger l’historique' }, { status: 500 });
  }
}
