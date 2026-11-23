-- Deploy: rls_pets
-- requires: pets_app

-- Add owner_id column to track pet owners
ALTER TABLE pets.pets
  ADD COLUMN owner_id UUID;

-- Enable RLS on the pets table
ALTER TABLE pets.pets ENABLE ROW LEVEL SECURITY;

-- Grant schema usage to Supabase roles
GRANT USAGE ON SCHEMA pets TO anon;
GRANT USAGE ON SCHEMA pets TO authenticated;

-- Grant table permissions
GRANT SELECT ON TABLE pets.pets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE pets.pets TO authenticated;

-- Enable RLS on both tables
ALTER TABLE pets.pets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
-- Users can view their own data
CREATE POLICY "Users can view own data" ON pets.pets
    FOR SELECT USING (auth.uid() = owner_id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON pets.pets
    FOR UPDATE USING (auth.uid() = owner_id);

-- Users can insert their own data
CREATE POLICY "Users can insert own data" ON pets.pets
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can delete their own data
CREATE POLICY "Users can delete own data" ON pets.pets
    FOR DELETE USING (auth.uid() = owner_id);

-- Grant permissions to anon users
GRANT USAGE ON SCHEMA pets TO anon;
GRANT ALL ON pets.pets TO anon;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA pets TO authenticated;
GRANT ALL ON pets.pets TO authenticated;

-- Grant permissions to service role (for admin operations)
GRANT USAGE ON SCHEMA pets TO service_role;
GRANT ALL ON pets.pets TO service_role;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_owner_id ON pets.pets(owner_id);
