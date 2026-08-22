CREATE TABLE IF NOT EXISTS gsc_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  state_hash text NOT NULL,
  encrypted_code_verifier text NOT NULL,
  expires_at timestamp NOT NULL,
  consumed_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT gsc_oauth_states_state_hash_unique UNIQUE(state_hash)
);

CREATE INDEX IF NOT EXISTS gsc_oauth_states_workspace_project_idx
  ON gsc_oauth_states USING btree (workspace_id, project_id);

CREATE INDEX IF NOT EXISTS gsc_oauth_states_expires_at_idx
  ON gsc_oauth_states USING btree (expires_at);
