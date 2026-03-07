-- Add relationship fields to biographies. Run in Supabase → SQL Editor.

alter table public.biographies
  add column if not exists father_id uuid references public.biographies(id) on delete set null,
  add column if not exists son_ids uuid[] default '{}',
  add column if not exists brother_ids uuid[] default '{}';

comment on column public.biographies.father_id is 'ID of the father biography';
comment on column public.biographies.son_ids is 'IDs of son biographies';
comment on column public.biographies.brother_ids is 'IDs of brother biographies';
