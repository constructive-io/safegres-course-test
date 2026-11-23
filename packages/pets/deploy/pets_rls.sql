-- Deploy pets_rls
-- requires: pets_table

-- Add owner column
ALTER TABLE app.pets
  ADD COLUMN user_id TEXT NOT NULL;

-- Enable RLS
ALTER TABLE app.pets ENABLE ROW LEVEL SECURITY;

-- Grant permissions to the app role
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.pets TO authenticated;

-- A row is visible/mutable only by the authenticated user that owns it
CREATE POLICY pets_select ON app.pets
  FOR SELECT USING (user_id = current_setting('jwt.claims.user_id', true));

CREATE POLICY pets_insert ON app.pets
  FOR INSERT WITH CHECK (user_id = current_setting('jwt.claims.user_id', true));

CREATE POLICY pets_update ON app.pets
  FOR UPDATE USING (user_id = current_setting('jwt.claims.user_id', true));

CREATE POLICY pets_delete ON app.pets
  FOR DELETE USING (user_id = current_setting('jwt.claims.user_id', true));
