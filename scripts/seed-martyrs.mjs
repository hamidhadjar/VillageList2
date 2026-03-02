/**
 * Seed the database with martyrs from Liste_Martyrs_Imaghdacene.
 * Run with: node scripts/seed-martyrs.mjs
 * Make sure the dev server is running (npm run dev) so the API is available.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const martyrsPath = join(projectRoot, 'data', 'martyrs-imaghdacene.json');

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

const martyrs = JSON.parse(readFileSync(martyrsPath, 'utf-8'));

function buildBiography(entry) {
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
    title: 'Martyr',
    birthDate: undefined,
    deathDate,
    summary,
    fullBio,
  };
}

let created = 0;
let failed = 0;

for (const entry of martyrs) {
  const body = buildBiography(entry);
  try {
    const res = await fetch(`${API_BASE}/api/biographies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      created++;
      console.log('Ajouté:', body.name);
    } else {
      const err = await res.json().catch(() => ({}));
      console.error('Échec', body.name, res.status, err.error || res.statusText);
      failed++;
    }
  } catch (e) {
    console.error('Erreur', body.name, e.message);
    failed++;
  }
}

console.log('\nTerminé:', created, 'créés,', failed, 'échecs.');
