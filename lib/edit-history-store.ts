import type { EditHistoryEntry, EditHistoryInput } from './edit-history-types';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'edit-history.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // read-only fs
    }
  }
}

function readEntries(): EditHistoryEntry[] {
  try {
    if (typeof fs.existsSync !== 'function' || !fs.existsSync(FILE_PATH)) return [];
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: EditHistoryEntry[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(FILE_PATH, JSON.stringify(entries, null, 2), 'utf-8');
  } catch {
    // ignore (read-only or not writable)
  }
}

export function addEntry(input: EditHistoryInput): EditHistoryEntry | null {
  try {
    const entries = readEntries();
    const now = new Date().toISOString();
    const entry: EditHistoryEntry = {
      id: crypto.randomUUID(),
      userEmail: input.userEmail,
      userRole: input.userRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      createdAt: now,
    };
    entries.unshift(entry);
    const maxEntries = 5000;
    if (entries.length > maxEntries) entries.length = maxEntries;
    writeEntries(entries);
    return entry;
  } catch {
    return null;
  }
}

export function getAllEntries(limit = 200): EditHistoryEntry[] {
  const entries = readEntries();
  return entries.slice(0, limit);
}
