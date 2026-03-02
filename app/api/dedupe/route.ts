import { NextResponse } from 'next/server';
import { getAllBiographies, deleteBiography } from '@/lib/db';

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function POST() {
  try {
    const all = await getAllBiographies();
    const seen = new Map<string, string>(); // normalizedName -> id to keep
    const duplicateIds: string[] = [];

    for (const bio of all) {
      const key = normalizeName(bio.name);
      if (seen.has(key)) {
        duplicateIds.push(bio.id);
      } else {
        seen.set(key, bio.id);
      }
    }

    for (const id of duplicateIds) {
      await deleteBiography(id);
    }

    return NextResponse.json({
      message: `${duplicateIds.length} doublon(s) supprimé(s). ${seen.size} biographie(s) conservée(s).`,
      deleted: duplicateIds.length,
      kept: seen.size,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur lors de la déduplication.' },
      { status: 500 }
    );
  }
}
