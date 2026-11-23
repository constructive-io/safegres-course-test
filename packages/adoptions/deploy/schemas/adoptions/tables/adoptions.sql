-- Deploy schemas/adoptions/tables/adoptions

CREATE TABLE adoptions.adoptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets.pets(id),
  adopter_name TEXT NOT NULL,
  adoption_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON adoptions.adoptions (pet_id);
