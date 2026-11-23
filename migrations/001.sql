CREATE ROLE app_reader LOGIN;
CREATE SCHEMA app_public;
CREATE SCHEMA app_private;

CREATE TABLE app_public.documents (id integer PRIMARY KEY);
ALTER TABLE app_public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_public.documents FORCE ROW LEVEL SECURITY;
CREATE POLICY documents_read ON app_public.documents
  FOR SELECT TO app_reader USING (id = 1);

CREATE TABLE app_private.import_queue (id integer PRIMARY KEY);

GRANT USAGE ON SCHEMA app_public, app_private TO app_reader;
GRANT SELECT ON app_public.documents, app_private.import_queue TO app_reader;

CREATE TABLE app_public.child (
  id integer PRIMARY KEY,
  document_id integer REFERENCES app_public.documents (id)
);
