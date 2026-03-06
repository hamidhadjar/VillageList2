import { Biography } from './types';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'biographies.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Read-only: no mkdir so this works on read-only filesystems (e.g. Netlify). */
function readBiographies(): Biography[] {
  if (!fs.existsSync(FILE_PATH)) return [];
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeBiographies(items: Biography[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(FILE_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    throw new Error('Biography file storage is read-only in this environment (e.g. Netlify). Configure Supabase or use a writable data directory.', { cause: err });
  }
}

export function getAllBiographies(): Biography[] {
  return readBiographies();
}

export function getBiographyById(id: string): Biography | undefined {
  return readBiographies().find((b) => b.id === id);
}

export function createBiography(input: Omit<Biography, 'id' | 'createdAt' | 'updatedAt'>): Biography {
  const items = readBiographies();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const imageUrlsCopy = input.imageUrls && input.imageUrls.length > 0 ? [...input.imageUrls] : input.imageUrls;
  const newBio: Biography = {
    ...input,
    imageUrls: imageUrlsCopy,
    imageUrl: imageUrlsCopy?.[0] ?? input.imageUrl,
    id,
    createdAt: now,
    updatedAt: now,
  };
  items.push(newBio);
  writeBiographies(items);
  return newBio;
}

export function updateBiography(id: string, input: Partial<Biography>): Biography | null {
  const items = readBiographies();
  const index = items.findIndex((b) => b.id === id);
  if (index === -1) return null;
  const now = new Date().toISOString();
  const imageUrlsCopy = input.imageUrls && input.imageUrls.length > 0 ? [...input.imageUrls] : input.imageUrls;
  const imageUrl = input.imageUrls !== undefined
    ? (imageUrlsCopy?.length ? imageUrlsCopy[0] : undefined)
    : (input.imageUrl ?? items[index].imageUrl);
  items[index] = {
    ...items[index],
    ...input,
    imageUrls: imageUrlsCopy,
    imageUrl,
    id,
    updatedAt: now,
    lastEditedAt: input.lastEditedAt ?? now,
    lastEditedBy: input.lastEditedBy ?? items[index].lastEditedBy,
  };
  writeBiographies(items);
  return items[index];
}

export function deleteBiography(id: string): boolean {
  const items = readBiographies().filter((b) => b.id !== id);
  if (items.length === readBiographies().length) return false;
  writeBiographies(items);
  return true;
}
