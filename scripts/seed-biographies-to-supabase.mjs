#!/usr/bin/env node
/**
 * Migrate biographies from data/biographies.json to Supabase.
 * Run locally with: node scripts/seed-biographies-to-supabase.mjs
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataPath = join(root, 'data', 'biographies.json');
const envPath = join(root, '.env');

if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf-8');
  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function exit(code) {
  setTimeout(() => process.exit(code), 100);
}

if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  console.error('  .env path:', envPath);
  console.error('  .env exists:', existsSync(envPath));
  if (existsSync(envPath)) {
    console.error('  Use exact names: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (with S at the start).');
  }
  exit(1);
} else if (!key.startsWith('eyJ') || key.split('.').length !== 3) {
  console.error('SUPABASE_SERVICE_ROLE_KEY should be the long JWT (starts with eyJ, 3 parts separated by dots).');
  console.error('  Get it from Supabase: Project Settings → API → service_role → Reveal (not the anon key).');
  exit(1);
} else {
  main().catch((e) => {
    console.error(e);
    exit(1);
  });
}

function toRow(bio) {
  const imageUrls = Array.isArray(bio.imageUrls)
    ? bio.imageUrls.filter((u) => typeof u === 'string')
    : bio.imageUrl
      ? [bio.imageUrl]
      : [];
  return {
    id: bio.id,
    name: bio.name ?? '',
    title: bio.title ?? null,
    birth_date: bio.birthDate ?? null,
    death_date: bio.deathDate ?? null,
    summary: bio.summary ?? '',
    full_bio: bio.fullBio ?? '',
    image_url: imageUrls[0] ?? null,
    image_urls: imageUrls.length ? imageUrls : null,
    created_at: bio.createdAt ?? new Date().toISOString(),
    updated_at: bio.updatedAt ?? new Date().toISOString(),
    last_edited_at: bio.lastEditedAt ?? null,
    last_edited_by: bio.lastEditedBy ?? null,
    chahid: bio.chahid === false ? false : true,
  };
}

async function main() {
  let list;
  try {
    list = JSON.parse(readFileSync(dataPath, 'utf-8'));
  } catch (e) {
    console.error('Could not read data/biographies.json:', e.message);
    exit(1);
    return;
  }

  if (!Array.isArray(list) || list.length === 0) {
    console.log('No biographies in data/biographies.json.');
    exit(0);
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const rows = list.map(toRow);

  const { data, error } = await supabase.from('biographies').upsert(rows, {
    onConflict: 'id',
    ignoreDuplicates: false,
  });

  if (error) {
    console.error('Supabase error:', error.message);
    if (error.message?.includes('Invalid API key')) {
      console.error('  Use the service_role key (secret), not anon. Supabase → Project Settings → API → service_role → Reveal.');
      console.error('  Copy the full key with no spaces or line breaks.');
    }
    if (error.message?.includes('Could not find the table') || error.message?.includes('schema cache')) {
      console.error('  Create the table first: Supabase → SQL Editor → run docs/supabase-schema.sql');
    }
    if (error.message?.includes('image_urls')) {
      console.error('  Run docs/supabase-migration-image-urls.sql in Supabase SQL Editor first.');
    }
    exit(1);
    return;
  }

  console.log(`Done. ${rows.length} biographies synced to Supabase.`);
}
