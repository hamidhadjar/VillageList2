-- Chahid flag on biographies. Run in Supabase → SQL Editor.

alter table public.biographies
  add column if not exists chahid boolean not null default true;

-- If the column already existed with default false, fix default for new rows:
alter table public.biographies
  alter column chahid set default true;

comment on column public.biographies.chahid is 'Person is a Chahid (martyr); default true';
