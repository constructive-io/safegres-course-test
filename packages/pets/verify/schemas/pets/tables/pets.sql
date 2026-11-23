-- Verify schemas/pets/tables/pets

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'pets'
  AND table_name = 'pets';
