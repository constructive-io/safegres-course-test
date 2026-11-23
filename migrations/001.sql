CREATE FUNCTION app_public.document_ids()
RETURNS SETOF integer
LANGUAGE sql
AS $$
  SELECT id FROM app_public.documents;
$$;
