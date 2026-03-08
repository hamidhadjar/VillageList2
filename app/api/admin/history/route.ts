import { NextRequest, NextResponse } from 'next/server';
import { getTokenSafe } from '@/lib/auth-token';
import { getAllEditHistory } from '@/lib/edit-history-db';

export async function GET(request: NextRequest) {
  const token = await getTokenSafe(request);
  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 200, 500);
    const entries = await getAllEditHistory(limit);
    return NextResponse.json(Array.isArray(entries) ? entries : []);
  } catch {
    return NextResponse.json([]);
  }
}
