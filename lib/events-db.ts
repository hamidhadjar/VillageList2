import { getSupabase } from './supabase';
import * as eventsStore from './events-store';
import type { Event } from './event-types';

const TABLE = 'events';

function rowToEvent(row: Record<string, unknown>): Event {
  const imageUrls = Array.isArray(row.image_urls)
    ? (row.image_urls as string[]).filter((u): u is string => typeof u === 'string')
    : (row.image_url as string) ? [row.image_url as string] : [];
  return {
    id: String(row.id ?? ''),
    title: (row.title as string)?.trim() || undefined,
    date: (row.date as string)?.trim() || undefined,
    place: (row.place as string)?.trim() || undefined,
    description: (row.description as string) ?? '',
    imageUrl: imageUrls[0],
    imageUrls: imageUrls.length ? imageUrls : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllEvents(): Promise<Event[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToEvent);
    } catch {
      return Promise.resolve(eventsStore.getAllEvents());
    }
  }
  return Promise.resolve(eventsStore.getAllEvents());
}

export async function getEventById(id: string): Promise<Event | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToEvent(data) : null;
    } catch {
      const e = eventsStore.getEventById(id);
      return Promise.resolve(e ?? null);
    }
  }
  const e = eventsStore.getEventById(id);
  return Promise.resolve(e ?? null);
}

export async function createEvent(
  input: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Event> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const now = new Date().toISOString();
      const imageUrls = input.imageUrls?.length ? input.imageUrls : (input.imageUrl ? [input.imageUrl] : []);
      const row = {
        title: input.title?.trim() || null,
        date: input.date?.trim() || null,
        place: input.place?.trim() || null,
        description: input.description?.trim() ?? '',
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls.length ? imageUrls : null,
        created_at: now,
        updated_at: now,
      };
      const { data, error } = await supabase.from(TABLE).insert(row).select().single();
      if (error) throw error;
      return rowToEvent(data);
    } catch {
      return Promise.resolve(eventsStore.createEvent(input));
    }
  }
  return Promise.resolve(eventsStore.createEvent(input));
}

export async function updateEvent(
  id: string,
  input: Partial<Omit<Event, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Event | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const row: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (input.title !== undefined) row.title = input.title?.trim() || null;
      if (input.date !== undefined) row.date = input.date?.trim() || null;
      if (input.place !== undefined) row.place = input.place?.trim() || null;
      if (input.description !== undefined) row.description = input.description?.trim() ?? '';
      if (input.imageUrls !== undefined) {
        row.image_urls = input.imageUrls?.length ? input.imageUrls : [];
        row.image_url = input.imageUrls?.[0] ?? null;
      } else if (input.imageUrl !== undefined) {
        row.image_url = input.imageUrl ?? null;
        row.image_urls = input.imageUrl ? [input.imageUrl] : [];
      }
      const { data, error } = await supabase
        .from(TABLE)
        .update(row)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? rowToEvent(data) : null;
    } catch {
      const full: Partial<Event> = { ...input };
      return Promise.resolve(eventsStore.updateEvent(id, full));
    }
  }
  const full: Partial<Event> = { ...input };
  return Promise.resolve(eventsStore.updateEvent(id, full));
}

export async function deleteEvent(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    } catch {
      return Promise.resolve(eventsStore.deleteEvent(id));
    }
  }
  return Promise.resolve(eventsStore.deleteEvent(id));
}
