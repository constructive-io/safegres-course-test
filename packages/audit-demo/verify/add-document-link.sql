-- Verify: add-document-link

BEGIN;
SELECT document_id FROM app_public.child WHERE false;
ROLLBACK;
