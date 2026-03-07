import { getSupabase } from './supabase';
import * as store from './store';
import { Biography } from './types';

const TABLE = 'biographies';

function rowToBio(row: Record<string, unknown>): Biography {
  const imageUrls = Array.isArray(row.image_urls)
    ? (row.image_urls as string[])
    : (row.image_url ? [row.image_url as string] : []);
  const imageUrl = imageUrls[0];
  const sonIds = Array.isArray(row.son_ids) ? (row.son_ids as string[]).filter((id): id is string => typeof id === 'string') : undefined;
  const brotherIds = Array.isArray(row.brother_ids) ? (row.brother_ids as string[]).filter((id): id is string => typeof id === 'string') : undefined;
  return {
    id: row.id as string,
    name: row.name as string,
    title: (row.title as string) ?? undefined,
    birthDate: (row.birth_date as string) ?? undefined,
    deathDate: (row.death_date as string) ?? undefined,
    summary: row.summary as string,
    fullBio: row.full_bio as string,
    imageUrl,
    imageUrls: imageUrls.length ? imageUrls : undefined,
    fatherId: (row.father_id as string) ?? undefined,
    sonIds: sonIds?.length ? sonIds : undefined,
    brotherIds: brotherIds?.length ? brotherIds : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    lastEditedAt: (row.last_edited_at as string) ?? undefined,
    lastEditedBy: (row.last_edited_by as string) ?? undefined,
  };
}

export async function getAllBiographies(): Promise<Biography[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToBio);
  }
  return Promise.resolve(store.getAllBiographies());
}

export async function getBiographyById(id: string): Promise<Biography | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToBio(data) : null;
  }
  const bio = store.getBiographyById(id);
  return Promise.resolve(bio ?? null);
}

export async function createBiography(
  input: Omit<Biography, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Biography> {
  const supabase = getSupabase();
  if (supabase) {
    const imageUrls = input.imageUrls?.length ? input.imageUrls : (input.imageUrl ? [input.imageUrl] : []);
    const row: Record<string, unknown> = {
      name: input.name,
      title: input.title ?? null,
      birth_date: input.birthDate ?? null,
      death_date: input.deathDate ?? null,
      summary: input.summary,
      full_bio: input.fullBio,
      image_url: imageUrls[0] ?? null,
      father_id: input.fatherId ?? null,
      son_ids: input.sonIds?.length ? input.sonIds : null,
      brother_ids: input.brotherIds?.length ? input.brotherIds : null,
    };
    if (imageUrls.length) row.image_urls = imageUrls;
    const { data, error } = await supabase.from(TABLE).insert(row).select().single();
    if (error) throw error;
    return rowToBio(data);
  }
  return Promise.resolve(store.createBiography(input));
}

export async function updateBiography(
  id: string,
  input: Partial<Omit<Biography, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Biography | null> {
  const supabase = getSupabase();
  if (supabase) {
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.title !== undefined) row.title = input.title;
    if (input.birthDate !== undefined) row.birth_date = input.birthDate;
    if (input.deathDate !== undefined) row.death_date = input.deathDate;
    if (input.summary !== undefined) row.summary = input.summary;
    if (input.fullBio !== undefined) row.full_bio = input.fullBio;
    if (input.imageUrls !== undefined) {
      row.image_urls = input.imageUrls?.length ? input.imageUrls : [];
      row.image_url = input.imageUrls?.[0] ?? null;
    } else if (input.imageUrl !== undefined) {
      row.image_url = input.imageUrl ?? null;
      row.image_urls = input.imageUrl ? [input.imageUrl] : [];
    }
    if (input.fatherId !== undefined) row.father_id = input.fatherId?.trim() || null;
    if (input.sonIds !== undefined) row.son_ids = input.sonIds?.length ? input.sonIds : [];
    if (input.brotherIds !== undefined) row.brother_ids = input.brotherIds?.length ? input.brotherIds : [];
    const now = new Date().toISOString();
    row.updated_at = now;
    if (input.lastEditedAt !== undefined) row.last_edited_at = input.lastEditedAt;
    if (input.lastEditedBy !== undefined) row.last_edited_by = input.lastEditedBy;

    const { data, error } = await supabase
      .from(TABLE)
      .update(row)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? rowToBio(data) : null;
  }
  const fullInput: Partial<Biography> = { ...input };
  return Promise.resolve(store.updateBiography(id, fullInput));
}

export async function deleteBiography(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }
  return Promise.resolve(store.deleteBiography(id));
}
