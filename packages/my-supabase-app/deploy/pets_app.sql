-- Deploy: pets_app

CREATE SCHEMA IF NOT EXISTS pets;
CREATE TABLE IF NOT EXISTS pets.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    breed TEXT NOT NULL
);
GRANT USAGE ON SCHEMA pets TO public;
GRANT ALL ON pets.pets TO public;
