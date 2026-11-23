-- Deploy pets_rls
-- requires: pets_table

-- Add user_id column
ALTER TABLE pets
  ADD COLUMN user_id TEXT NOT NULL;

CREATE INDEX pets_user_id_idx ON pets (user_id);

-- Enable RLS
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets FORCE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON TABLE pets TO anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE pets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE pets_id_seq TO authenticated;

-- Policy: Anyone can view all pets
CREATE POLICY pets_select_all ON pets
  FOR SELECT
  USING (true);

-- Policy: Users can only insert pets they own
CREATE POLICY pets_insert_own ON pets
  FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('jwt.claims.user_id', true)));

-- Policy: Users can only update their own pets
CREATE POLICY pets_update_own ON pets
  FOR UPDATE
  USING (user_id = (SELECT current_setting('jwt.claims.user_id', true)));

-- Policy: Users can only delete their own pets
CREATE POLICY pets_delete_own ON pets
  FOR DELETE
  USING (user_id = (SELECT current_setting('jwt.claims.user_id', true)));
