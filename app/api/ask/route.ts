import { NextRequest, NextResponse } from 'next/server';
import { getAllBiographies } from '@/lib/db';
import type { Biography } from '@/lib/types';

/** Normalize place from question: trim, remove trailing ?!. */
function normalizePlace(s: string): string {
  return s.replace(/[?!.]$/g, '').trim();
}

/** Match "combien morts à X", "how many died in X", "décédés à X", etc. */
function matchDeathPlaceCount(q: string): string | null {
  const m =
    q.match(/(?:combien|how\s+many)\s+(?:sont\s+)?(?:mort|décédé)s?\s+(?:à|dans|in)\s+(.+)/i) ||
    q.match(/(?:combien|how\s+many)\s+(?:personnes?\s+)?(?:died|dead)\s+(?:in|at)\s+(.+)/i);
  return m ? normalizePlace(m[1]) : null;
}

/** Match "qui est mort à X", "list people who died in X", etc. */
function matchDeathPlaceList(q: string): string | null {
  const m =
    q.match(/(?:qui|liste?|qui sont)\s+(?:est\s+)?(?:mort|décédé)s?\s+(?:à|dans|in)\s+(.+)/i) ||
    q.match(/(?:who|list)\s+(?:are\s+)?(?:died|dead)\s+(?:in|at)\s+(.+)/i) ||
    q.match(/(?:personnes?\s+)?(?:mortes?|décédées?)\s+(?:à|dans|in)\s+(.+)/i);
  return m ? normalizePlace(m[m.length - 1]) : null;
}

/** Match "combien nés à X", "how many born in X", etc. */
function matchBirthPlaceCount(q: string): string | null {
  const m =
    q.match(/(?:combien|how\s+many)\s+(?:sont\s+)?nés?\s+(?:à|dans|in)\s+(.+)/i) ||
    q.match(/(?:combien|how\s+many)\s+(?:personnes?\s+)?(?:born|birth)\s+(?:in|at)\s+(.+)/i);
  return m ? normalizePlace(m[1]) : null;
}

/** Match "qui est né à X", "list people born in X", etc. */
function matchBirthPlaceList(q: string): string | null {
  const m =
    q.match(/(?:qui|liste?)\s+(?:est\s+)?nés?\s+(?:à|dans|in)\s+(.+)/i) ||
    q.match(/(?:who|list)\s+(?:are\s+)?(?:born|birth)\s+(?:in|at)\s+(.+)/i);
  return m ? normalizePlace(m[m.length - 1]) : null;
}

/** Total count of biographies. */
function matchTotalCount(q: string): boolean {
  return /(?:combien|how\s+many|nombre|total)\s+(?:de\s+)?(?:biographies?|personnes?|people)/i.test(q)
    || /(?:nombre\s+total|total\s+number)/i.test(q);
}

function answerQuestion(bios: Biography[], question: string): string {
  const q = question.trim();
  if (!q) return 'Posez une question, par exemple : « Combien sont morts à Alger ? » ou « Qui est né à Tizi Ouzou ? »';

  const placeDeathCount = matchDeathPlaceCount(q);
  if (placeDeathCount) {
    const match = bios.filter(
      (b) => b.deathPlace && b.deathPlace.toLowerCase().includes(placeDeathCount.toLowerCase())
    );
    const n = match.length;
    if (n === 0) return `Aucune biographie avec lieu de décès contenant « ${placeDeathCount} ».`;
    return `${n} personne${n > 1 ? 's' : ''} avec un lieu de décès contenant « ${placeDeathCount} ».`;
  }

  const placeDeathList = matchDeathPlaceList(q);
  if (placeDeathList) {
    const match = bios.filter(
      (b) => b.deathPlace && b.deathPlace.toLowerCase().includes(placeDeathList.toLowerCase())
    );
    if (match.length === 0) return `Aucune biographie avec lieu de décès contenant « ${placeDeathList} ».`;
    const names = match.slice(0, 30).map((b) => b.name);
    const more = match.length > 30 ? ` … et ${match.length - 30} autre(s)` : '';
    return `${match.length} personne(s) : ${names.join(', ')}${more}.`;
  }

  const placeBirthCount = matchBirthPlaceCount(q);
  if (placeBirthCount) {
    const match = bios.filter(
      (b) => b.birthPlace && b.birthPlace.toLowerCase().includes(placeBirthCount.toLowerCase())
    );
    const n = match.length;
    if (n === 0) return `Aucune biographie avec lieu de naissance contenant « ${placeBirthCount} ».`;
    return `${n} personne${n > 1 ? 's' : ''} avec un lieu de naissance contenant « ${placeBirthCount} ».`;
  }

  const placeBirthList = matchBirthPlaceList(q);
  if (placeBirthList) {
    const match = bios.filter(
      (b) => b.birthPlace && b.birthPlace.toLowerCase().includes(placeBirthList.toLowerCase())
    );
    if (match.length === 0) return `Aucune biographie avec lieu de naissance contenant « ${placeBirthList} ».`;
    const names = match.slice(0, 30).map((b) => b.name);
    const more = match.length > 30 ? ` … et ${match.length - 30} autre(s)` : '';
    return `${match.length} personne(s) : ${names.join(', ')}${more}.`;
  }

  if (matchTotalCount(q)) {
    const n = bios.length;
    return `Il y a ${n} biographie${n > 1 ? 's' : ''} au total.`;
  }

  return 'Je ne comprends pas cette question. Vous pouvez demander par exemple : « Combien sont morts à Alger ? », « Qui est né à Tizi Ouzou ? », « Combien de biographies ? »';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = typeof body?.question === 'string' ? body.question : '';
    const bios = await getAllBiographies();
    const answer = answerQuestion(bios, question);
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lors de la recherche.', answer: '' }, { status: 500 });
  }
}
