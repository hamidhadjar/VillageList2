import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createBiography } from '@/lib/db';

const MARTYRS_PATH = path.join(process.cwd(), 'data', 'martyrs-imaghdacene.json');

function buildBiography(entry: { prenom: string; nom: string; deathDate?: string }) {
  const name = `${entry.prenom} ${entry.nom}`.trim();
  const deathDate = (entry.deathDate || '').trim() || undefined;
  const summary = deathDate
    ? `Martyr du village Imaghdacene. Décédé en ${deathDate}.`
    : 'Martyr du village Imaghdacene.';
  const fullBio = deathDate
    ? `${name} est un martyr du village Imaghdacene. Date de décès : ${deathDate}.`
    : `${name} est un martyr du village Imaghdacene.`;
  return {
    name,
    title: 'Martyr' as const,
    birthDate: undefined as string | undefined,
    deathDate,
    summary,
    fullBio,
  };
}

export async function POST() {
  try {
    if (!fs.existsSync(MARTYRS_PATH)) {
      return NextResponse.json(
        { error: 'Fichier data/martyrs-imaghdacene.json introuvable.' },
        { status: 404 }
      );
    }
    const raw = fs.readFileSync(MARTYRS_PATH, 'utf-8');
    const martyrs = JSON.parse(raw) as Array<{ prenom: string; nom: string; deathDate?: string }>;
    let created = 0;
    for (const entry of martyrs) {
      const body = buildBiography(entry);
      await createBiography(body);
      created++;
    }
    return NextResponse.json({
      message: `${created} biographies de martyrs ont été ajoutées.`,
      created,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur lors de l\'import.' },
      { status: 500 }
    );
  }
}
