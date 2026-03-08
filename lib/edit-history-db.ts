import { getSupabase } from './supabase';
import * as editHistoryStore from './edit-history-store';
import type { EditHistoryEntry, EditHistoryInput } from './edit-history-types';

const TABLE = 'edit_history';

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

export async function getAllEditHistory(limit = 200): Promise<EditHistoryEntry[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(rowToEntry);
    } catch {
      return editHistoryStore.getAllEntries(limit);
    }
  }
  return editHistoryStore.getAllEntries(limit);
}
