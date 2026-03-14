type SupabaseClient = import('@supabase/supabase-js').SupabaseClient;

let _client: SupabaseClient | null | undefined = undefined;

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    _client = null;
    return null;
  }
  try {
    const { createClient } = require('@supabase/supabase-js');
    const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    _client = client;
    return client;
  } catch {
    _client = null;
    return null;
  }
}
