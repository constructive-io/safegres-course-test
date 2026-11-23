-- Deploy documents_table
CREATE SCHEMA search;

CREATE TABLE search.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(3)
);
