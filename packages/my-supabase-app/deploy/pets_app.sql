-- Deploy: pets_app

CREATE SCHEMA pets;
CREATE TABLE pets.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    breed TEXT NOT NULL
);
