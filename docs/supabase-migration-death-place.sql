-- Add place of death (text) to biographies. Run in Supabase → SQL Editor.

alter table public.biographies
  add column if not exists death_place text;

comment on column public.biographies.death_place is 'Place name where the person died (e.g. city, hospital)';
