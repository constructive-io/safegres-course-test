DO $$
BEGIN
  IF has_table_privilege('authenticated', 'app_private.import_queue', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated can still read app_private.import_queue';
  END IF;
END;
$$;
