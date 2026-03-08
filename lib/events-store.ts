import type { Event } from './event-types';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'events.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readEvents(): Event[] {
  if (!fs.existsSync(FILE_PATH)) return [];
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeEvents(items: Event[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(FILE_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    throw new Error('Events file storage is read-only. Configure Supabase or use a writable data directory.', { cause: err });
  }
}

export function getAllEvents(): Event[] {
  return readEvents();
}

export function getEventById(id: string): Event | undefined {
  return readEvents().find((e) => e.id === id);
}

export function createEvent(input: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event {
  const items = readEvents();
  const now = new Date().toISOString();
  const newEvent: Event = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    lastEditedAt: input.lastEditedAt ?? now,
    lastEditedBy: input.lastEditedBy ?? undefined,
  };
  items.push(newEvent);
  writeEvents(items);
  return newEvent;
}

export function updateEvent(id: string, input: Partial<Omit<Event, 'id' | 'createdAt'>>): Event | null {
  const items = readEvents();
  const index = items.findIndex((e) => e.id === id);
  if (index === -1) return null;
  const now = new Date().toISOString();
  items[index] = {
    ...items[index],
    ...input,
    id,
    updatedAt: now,
    lastEditedAt: input.lastEditedAt ?? items[index].lastEditedAt ?? now,
    lastEditedBy: input.lastEditedBy !== undefined ? input.lastEditedBy : items[index].lastEditedBy,
  };
  writeEvents(items);
  return items[index];
}

export function deleteEvent(id: string): boolean {
  const items = readEvents().filter((e) => e.id !== id);
  if (items.length === readEvents().length) return false;
  writeEvents(items);
  return true;
}
