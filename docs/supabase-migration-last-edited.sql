-- Add "last edited" columns to biographies. Run in Supabase → SQL Editor if you already have the table.

alter table public.biographies
  add column if not exists last_edited_at timestamptz,
  add column if not exists last_edited_by text;

comment on column public.biographies.last_edited_at is 'When the row was last updated (by a user edit)';
comment on column public.biographies.last_edited_by is 'Email of the user who last edited';
