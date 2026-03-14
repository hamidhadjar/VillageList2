-- Add event location (GPS) for map. Run in Supabase → SQL Editor.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS event_lng DOUBLE PRECISION;

COMMENT ON COLUMN events.event_lat IS 'Latitude of the event location (for map)';
COMMENT ON COLUMN events.event_lng IS 'Longitude of the event location (for map)';
