-- Add image_urls array column. Run in Supabase → SQL Editor if you already have the table.

alter table public.biographies
  add column if not exists image_urls text[];

comment on column public.biographies.image_urls is 'Array of image URLs (multiple images per biography)';
