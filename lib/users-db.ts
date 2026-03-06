import { getSupabase } from './supabase';
import * as usersStore from './users-store';
import type { User, UserInput, Role } from './user-types';

const TABLE = 'app_users';

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: (row.email as string) ?? '',
    passwordHash: (row.password_hash as string) ?? '',
    role: (row.role as Role) ?? 'viewer',
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? '',
  };
}

export async function getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from(TABLE).select('id, email, role, created_at, updated_at').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      email: row.email ?? '',
      role: (row.role as Role) ?? 'viewer',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
      passwordHash: '',
    }));
  }
  return Promise.resolve(usersStore.getAllUsers());
}

export async function getUserById(id: string): Promise<Omit<User, 'passwordHash'> | undefined> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from(TABLE).select('id, email, role, created_at, updated_at').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    return { ...rowToUser({ ...data, password_hash: '' }), passwordHash: '' };
  }
  return Promise.resolve(usersStore.getUserById(id));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<Omit<User, 'passwordHash'> | undefined> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from(TABLE).select('id, email, role, created_at, updated_at').eq('email', normalizeEmail(email)).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    return { ...rowToUser({ ...data, password_hash: '' }), passwordHash: '' };
  }
  return Promise.resolve(usersStore.getUserByEmail(email));
}

export async function getUserWithPasswordByEmail(email: string): Promise<User | undefined> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('email', normalizeEmail(email)).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    return rowToUser(data);
  }
  return Promise.resolve(usersStore.getUserWithPasswordByEmail(email));
}

export async function createUser(input: UserInput): Promise<Omit<User, 'passwordHash'>> {
  const supabase = getSupabase();
  if (supabase) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const row = {
      id,
      email: input.email.trim().toLowerCase(),
      password_hash: input.passwordHash,
      role: input.role,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase.from(TABLE).insert(row).select('id, email, role, created_at, updated_at').single();
    if (error) throw error;
    return { ...rowToUser({ ...data, password_hash: '' }), passwordHash: '' };
  }
  return Promise.resolve(usersStore.createUser(input));
}

export async function updateUser(
  id: string,
  input: Partial<Pick<User, 'email' | 'role' | 'passwordHash'>>
): Promise<Omit<User, 'passwordHash'> | null> {
  const supabase = getSupabase();
  if (supabase) {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.email !== undefined) row.email = input.email.trim().toLowerCase();
    if (input.role !== undefined) row.role = input.role;
    if (input.passwordHash !== undefined) row.password_hash = input.passwordHash;

    const { data, error } = await supabase.from(TABLE).update(row).eq('id', id).select('id, email, role, created_at, updated_at').maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { ...rowToUser({ ...data, password_hash: '' }), passwordHash: '' };
  }
  return Promise.resolve(usersStore.updateUser(id, input));
}

export async function deleteUser(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }
  return Promise.resolve(usersStore.deleteUser(id));
}
