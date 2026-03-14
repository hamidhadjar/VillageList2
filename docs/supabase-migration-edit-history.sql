-- Edit history / activity log for admin. Run in Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_role TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('biography', 'event', 'user')),
  entity_id TEXT,
  entity_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edit_history_created_at_idx ON edit_history (created_at DESC);
CREATE INDEX IF NOT EXISTS edit_history_entity_type_idx ON edit_history (entity_type);

COMMENT ON TABLE edit_history IS 'Log of create/update/delete actions by users (admin view only)';
