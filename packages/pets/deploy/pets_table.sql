-- Deploy pets_table

CREATE SCHEMA app;

CREATE TABLE app.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  age INTEGER,
  adopted BOOLEAN DEFAULT false
);
