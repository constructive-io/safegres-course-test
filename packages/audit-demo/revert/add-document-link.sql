-- Revert: add-document-link

BEGIN;
DROP TABLE app_public.child;
COMMIT;
