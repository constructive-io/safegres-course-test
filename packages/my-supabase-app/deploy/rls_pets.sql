-- Deploy: rls_pets
-- requires: pets_app

-- Add owner_id column to track pet owners
ALTER TABLE pets.pets
  ADD COLUMN owner_id UUID;

-- Enable RLS on the pets table
ALTER TABLE pets.pets ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA pets TO anon, authenticated;

-- Grant table permissions
GRANT SELECT ON TABLE pets.pets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE pets.pets TO authenticated;

-- Users can view their own data
CREATE POLICY "Users can view own data" ON pets.pets
    FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON pets.pets
    FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

-- Users can insert their own data
CREATE POLICY "Users can insert own data" ON pets.pets
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- Users can delete their own data
CREATE POLICY "Users can delete own data" ON pets.pets
    FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Create indexes for better performance
CREATE INDEX idx_pets_owner_id ON pets.pets(owner_id);
