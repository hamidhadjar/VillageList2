-- Add death location (GPS) to biographies. Run in Supabase → SQL Editor.

alter table public.biographies
  add column if not exists death_lat double precision,
  add column if not exists death_lng double precision;

comment on column public.biographies.death_lat is 'Latitude where the person died (for map)';
comment on column public.biographies.death_lng is 'Longitude where the person died (for map)';
