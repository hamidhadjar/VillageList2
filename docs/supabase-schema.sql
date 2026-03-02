-- Run this in Supabase: SQL Editor → New query → paste and run.

-- Biographies table
create table if not exists public.biographies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  birth_date text,
  death_date text,
  summary text not null,
  full_bio text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_edited_at timestamptz,
  last_edited_by text
);

-- Optional: trigger to auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists biographies_updated_at on public.biographies;
create trigger biographies_updated_at
  before update on public.biographies
  for each row execute function public.set_updated_at();

-- Storage bucket (create in Supabase Dashboard):
-- Storage → New bucket → Name: biography-images → Public bucket: ON
-- The app uses the service role key to upload; no extra policies needed.
