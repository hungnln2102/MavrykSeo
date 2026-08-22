CREATE TABLE IF NOT EXISTS gsc_sync_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  state text DEFAULT 'property_selected' NOT NULL,
  last_successful_sync_at timestamp,
  last_sync_started_at timestamp,
  last_sync_start_date text,
  last_sync_end_date text,
  last_error_code text,
  last_error_message text,
  retry_count integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT gsc_sync_states_project_unique UNIQUE(project_id)
);
CREATE INDEX IF NOT EXISTS gsc_sync_states_workspace_state_idx ON gsc_sync_states USING btree (workspace_id, state);
