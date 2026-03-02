/**
 * Crée le premier utilisateur administrateur si data/users.json est vide.
 * Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node scripts/create-first-admin.mjs
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'users.json');
const SALT_ROUNDS = 10;

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let users = [];
  if (fs.existsSync(FILE_PATH)) {
    try {
      users = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
    } catch {
      users = [];
    }
  }

  if (users.length > 0) {
    console.log('Des utilisateurs existent déjà. Aucun admin créé.');
    process.exit(0);
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  if (!email || !password) {
    console.error('Définissez ADMIN_EMAIL et ADMIN_PASSWORD (ou utilisez les valeurs par défaut).');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  fs.writeFileSync(FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
  console.log('Premier administrateur créé:', email);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
