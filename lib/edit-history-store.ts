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

export function getAllEntries(limit = 200, userEmail?: string): EditHistoryEntry[] {
  let entries = readEntries();
  if (userEmail?.trim()) {
    const email = userEmail.trim().toLowerCase();
    entries = entries.filter((e) => e.userEmail?.toLowerCase() === email);
  }
  return entries.slice(0, limit);
}

function getCutoffMs(range: '1h' | '1d' | '7d' | '30d'): number {
  const now = Date.now();
  if (range === '1h') return now - 60 * 60 * 1000;
  if (range === '1d') return now - 24 * 60 * 60 * 1000;
  if (range === '7d') return now - 7 * 24 * 60 * 60 * 1000;
  if (range === '30d') return now - 30 * 24 * 60 * 60 * 1000;
  return 0;
}

export function deleteEntries(options: { range: '1h' | '1d' | '7d' | '30d' | 'all'; userEmail?: string }): number {
  try {
    const entries = readEntries();
    const user = options.userEmail?.trim().toLowerCase();
    const cutoff = options.range === 'all' ? 0 : getCutoffMs(options.range);
    const toKeep = entries.filter((e) => {
      const inWindow = options.range === 'all' ? true : new Date(e.createdAt).getTime() >= cutoff;
      if (!inWindow) return true;
      if (user && e.userEmail?.toLowerCase() !== user) return true;
      return false;
    });
    const deleted = entries.length - toKeep.length;
    writeEntries(toKeep);
    return deleted;
  } catch {
    return 0;
  }
}
