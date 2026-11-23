-- Verify schemas/pets

SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'pets';
