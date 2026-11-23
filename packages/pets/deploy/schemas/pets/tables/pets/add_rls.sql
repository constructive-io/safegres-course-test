-- Deploy: schemas/pets/tables/pets/add_rls
-- requires: schemas/pets/tables/pets

-- Add owner_id column
ALTER TABLE pets.pets
  ADD COLUMN owner_id UUID;

CREATE INDEX pets_owner_id_idx ON pets.pets (owner_id);

-- Enable RLS
ALTER TABLE pets.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets.pets FORCE ROW LEVEL SECURITY;

-- Grant schema usage
GRANT USAGE ON SCHEMA pets TO anonymous;
GRANT USAGE ON SCHEMA pets TO authenticated;

-- Grant permissions
GRANT SELECT ON TABLE pets.pets TO anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE pets.pets TO authenticated;

-- Policy: Both application roles can view all pets
CREATE POLICY pets_select_all ON pets.pets
  FOR SELECT
  TO anonymous, authenticated
  USING (true);

-- Policy: Users can only insert pets they own
CREATE POLICY pets_insert_own ON pets.pets
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::UUID));

-- Policy: Users can only update their own pets
CREATE POLICY pets_update_own ON pets.pets
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::UUID))
  WITH CHECK (owner_id = (SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::UUID));

-- Policy: Users can only delete their own pets
CREATE POLICY pets_delete_own ON pets.pets
  FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::UUID));
