-- Events table for /events page
-- Run this in the Supabase SQL editor if you use Supabase.

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT,
  place TEXT,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: enable RLS and allow service role full access (app uses service role)
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
