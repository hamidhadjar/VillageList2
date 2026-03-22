#!/usr/bin/env node
/**
 * Push users from data/users.json to Supabase app_users (for login on Vercel).
 * Run: node scripts/seed-users-to-supabase.mjs
 * Requires: .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataPath = join(root, 'data', 'users.json');
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

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

async function main() {
  let list;
  try {
    list = JSON.parse(readFileSync(dataPath, 'utf-8'));
  } catch (e) {
    console.error('Could not read data/users.json:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(list) || list.length === 0) {
    console.log('No users in data/users.json.');
    process.exit(0);
  }

  const rows = list.map((u) => ({
    id: u.id,
    email: (u.email || '').trim().toLowerCase(),
    password_hash: u.passwordHash || '',
    role: u.role || 'viewer',
    created_at: u.createdAt || new Date().toISOString(),
    updated_at: u.updatedAt || new Date().toISOString(),
  })).filter((r) => r.email && r.password_hash);

  if (rows.length === 0) {
    console.error('No valid users (email + passwordHash required).');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from('app_users').upsert(rows, {
    onConflict: 'id',
    ignoreDuplicates: false,
  });

  if (error) {
    console.error('Supabase error:', error.message);
    if (error.message?.includes('Could not find the table')) {
      console.error('  Run docs/supabase-app-users.sql in Supabase SQL Editor first.');
    }
    process.exit(1);
  }

  console.log(`Done. ${rows.length} user(s) synced to Supabase (login will use them on Vercel).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
