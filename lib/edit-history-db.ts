import { getSupabase } from './supabase';
import * as editHistoryStore from './edit-history-store';
import type { EditHistoryEntry, EditHistoryInput, DeleteHistoryRange } from './edit-history-types';

const TABLE = 'edit_history';

function getCutoffIso(range: DeleteHistoryRange): string | null {
  if (range === 'all') return null;
  const now = Date.now();
  let ms = 0;
  if (range === '1h') ms = 60 * 60 * 1000;
  else if (range === '1d') ms = 24 * 60 * 60 * 1000;
  else if (range === '7d') ms = 7 * 24 * 60 * 60 * 1000;
  else if (range === '30d') ms = 30 * 24 * 60 * 60 * 1000;
  return new Date(now - ms).toISOString();
}

function rowToEntry(row: Record<string, unknown>): EditHistoryEntry {
  return {
    id: String(row.id ?? ''),
    userEmail: (row.user_email as string) ?? '',
    userRole: (row.user_role as string)?.trim() || undefined,
    action: (row.action as EditHistoryEntry['action']) ?? 'update',
    entityType: (row.entity_type as EditHistoryEntry['entityType']) ?? 'biography',
    entityId: (row.entity_id as string)?.trim() || undefined,
    entityLabel: (row.entity_label as string)?.trim() || undefined,
    createdAt: (row.created_at as string) ?? '',
  };
}

export async function addEditLog(input: EditHistoryInput): Promise<EditHistoryEntry | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const row = {
        user_email: input.userEmail.trim(),
        user_role: input.userRole?.trim() || null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId?.trim() || null,
        entity_label: input.entityLabel?.trim() || null,
      };
      const { data, error } = await supabase.from(TABLE).insert(row).select().single();
      if (error) throw error;
      return data ? rowToEntry(data) : null;
    } catch {
      return editHistoryStore.addEntry(input);
    }
  }
  return editHistoryStore.addEntry(input);
}

/** Call from API routes after a successful create/update/delete. Does not throw. */
export function logEditHistory(input: EditHistoryInput): void {
  addEditLog(input).catch(() => {
    // ignore failures so main request is not affected
  });
}

export async function getAllEditHistory(limit = 200, userEmail?: string): Promise<EditHistoryEntry[]> {
  try {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(limit);
      if (userEmail?.trim()) {
        query = query.eq('user_email', userEmail.trim());
      }
      const { data, error } = await query;
      if (!error && data != null) return data.map(rowToEntry);
    }
    return editHistoryStore.getAllEntries(limit, userEmail);
  } catch {
    return editHistoryStore.getAllEntries(limit, userEmail);
  }
}

export async function deleteEditHistory(options: { range: DeleteHistoryRange; userEmail?: string }): Promise<number> {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const cutoff = getCutoffIso(options.range);
      let query = supabase.from(TABLE).delete();
      if (cutoff) query = query.gte('created_at', cutoff);
      if (options.userEmail?.trim()) query = query.eq('user_email', options.userEmail.trim());
      const { data, error } = await query.select('id');
      if (error) throw error;
      return Array.isArray(data) ? data.length : 0;
    }
    return editHistoryStore.deleteEntries({
      range: options.range,
      userEmail: options.userEmail,
    });
  } catch {
    return editHistoryStore.deleteEntries({
      range: options.range,
      userEmail: options.userEmail,
    });
  }
}
