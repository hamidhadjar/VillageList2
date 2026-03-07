-- Run once in Supabase → SQL Editor to create admin user hamid@gmail.com
-- Delete this file after running if you don't want it in the repo.

insert into public.app_users (email, password_hash, role)
values (
  'hamid@gmail.com',
  '$2a$10$4X.Iv8fMaCJv3djnWDKJEeYdI9LQPhkgkR5EjoQg8p3mNljyOYm26',
  'admin'
)
on conflict (email) do update set
  password_hash = excluded.password_hash,
  role = excluded.role,
  updated_at = now();
