\set ON_ERROR_STOP on
\getenv api_password PROJECTION_API_PASSWORD

CREATE ROLE projection_api
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'api_password';

GRANT CONNECT ON DATABASE projection_lab TO projection_api;
GRANT USAGE ON SCHEMA public TO projection_api;
GRANT SELECT ON TABLE public.countries TO projection_api;