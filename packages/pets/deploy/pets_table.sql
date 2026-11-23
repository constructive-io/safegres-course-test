-- Deploy pets_table

CREATE TABLE pets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  age INTEGER,
  adopted BOOLEAN DEFAULT false
);
