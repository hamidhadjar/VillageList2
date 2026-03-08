-- Events table for /events page
-- Run this in the Supabase SQL editor if you use Supabase.

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  date TEXT,
  place TEXT,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  image_urls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_edited_at TIMESTAMPTZ,
  last_edited_by TEXT
);

-- If you already have the events table, add missing columns:
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS title TEXT;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS image_urls JSONB;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS last_edited_by TEXT;

-- Optional: enable RLS and allow service role full access (app uses service role)
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
