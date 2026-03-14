-- Add spouse relationship to biographies. Run in Supabase → SQL Editor.

alter table public.biographies
  add column if not exists spouse_id uuid references public.biographies(id) on delete set null;

comment on column public.biographies.spouse_id is 'ID of the spouse biography (husband or wife)';
