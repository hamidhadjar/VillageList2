-- App users table (for login and admin). Run in Supabase → SQL Editor.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'edit', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_users_email_idx on public.app_users (lower(email));

comment on table public.app_users is 'App users for NextAuth credentials (admin / edit / viewer)';

-- First admin: run once (replace email and hash with your bcrypt hash).
-- To generate a hash locally: node -e "const b=require('bcryptjs'); b.hash('YourPassword',10).then(h=>console.log(h))"
-- insert into public.app_users (email, password_hash, role) values ('admin@example.com', 'YOUR_BCRYPT_HASH', 'admin');
