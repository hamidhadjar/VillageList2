-- Add place of birth to biographies. Run in Supabase → SQL Editor.

alter table public.biographies
  add column if not exists birth_place text;

comment on column public.biographies.birth_place is 'Place name where the person was born (e.g. city, village)';
