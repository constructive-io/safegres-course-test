-- Deploy schemas/adoptions/tables/adoption_history
-- requires: pets:schemas/pets/tables/pets

CREATE TABLE adoptions.adoption_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets.pets(id),
  event_type TEXT NOT NULL,
  event_date TIMESTAMPTZ DEFAULT now()
);
