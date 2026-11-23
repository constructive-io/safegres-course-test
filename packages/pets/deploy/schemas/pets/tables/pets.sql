-- Deploy schemas/pets/tables/pets
-- requires: schemas/pets

CREATE TABLE pets.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  age INTEGER,
  adopted BOOLEAN DEFAULT false
);
