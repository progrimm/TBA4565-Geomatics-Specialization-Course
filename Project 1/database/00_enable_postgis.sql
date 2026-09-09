\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS postgis;

SELECT current_database(), postgis_full_version();