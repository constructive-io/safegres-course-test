-- Deploy: add-document-link
-- made with <3 @ constructive.io

-- requires: create-documents

BEGIN;
CREATE TABLE app_public.child (
  id integer PRIMARY KEY,
  document_id integer REFERENCES app_public.documents (id)
);
COMMIT;
