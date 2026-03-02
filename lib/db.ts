import { getSupabase } from './supabase';
import * as store from './store';
import { Biography } from './types';

const TABLE = 'biographies';

function rowToBio(row: Record<string, unknown>): Biography {
  return {
    id: row.id as string,
    name: row.name as string,
    title: (row.title as string) ?? undefined,
    birthDate: (row.birth_date as string) ?? undefined,
    deathDate: (row.death_date as string) ?? undefined,
    summary: row.summary as string,
    fullBio: row.full_bio as string,
    imageUrl: (row.image_url as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
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
    const row = {
      name: input.name,
      title: input.title ?? null,
      birth_date: input.birthDate ?? null,
      death_date: input.deathDate ?? null,
      summary: input.summary,
      full_bio: input.fullBio,
      image_url: input.imageUrl ?? null,
    };
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
    if (input.imageUrl !== undefined) row.image_url = input.imageUrl ?? null;
    row.updated_at = new Date().toISOString();

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
