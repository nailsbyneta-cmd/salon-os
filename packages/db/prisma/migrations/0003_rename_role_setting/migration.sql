-- 0003_rename_role_setting
-- `current_role` ist in Postgres ein reservierter Keyword. `SET LOCAL app.current_role`
-- schlägt mit Syntax-Error fehl. Wir wechseln auf `app.current_user_role`.

CREATE OR REPLACE FUNCTION app_current_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_user_role', true)
$$;
