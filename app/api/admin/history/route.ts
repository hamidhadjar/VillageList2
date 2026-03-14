import { NextRequest, NextResponse } from 'next/server';
import { getTokenSafe } from '@/lib/auth-token';
import { getAllEditHistory, deleteEditHistory } from '@/lib/edit-history-db';
import type { DeleteHistoryRange } from '@/lib/edit-history-types';

const VALID_RANGES: DeleteHistoryRange[] = ['1h', '1d', '7d', '30d', 'all'];

export async function GET(request: NextRequest) {
  const token = await getTokenSafe(request);
  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 200, 500);
    const user = request.nextUrl.searchParams.get('user')?.trim() || undefined;
    const entries = await getAllEditHistory(limit, user);
    return NextResponse.json(Array.isArray(entries) ? entries : []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function DELETE(request: NextRequest) {
  const token = await getTokenSafe(request);
  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  try {
    const range = (request.nextUrl.searchParams.get('range') ?? '').toLowerCase();
    if (!VALID_RANGES.includes(range as DeleteHistoryRange)) {
      return NextResponse.json(
        { error: 'Paramètre range requis : 1h, 1d, 7d, 30d ou all' },
        { status: 400 }
      );
    }
    const user = request.nextUrl.searchParams.get('user')?.trim() || undefined;
    const deleted = await deleteEditHistory({
      range: range as DeleteHistoryRange,
      userEmail: user,
    });
    return NextResponse.json({ deleted });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
