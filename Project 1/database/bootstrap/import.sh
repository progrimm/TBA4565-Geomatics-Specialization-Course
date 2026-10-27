#!/bin/sh
set -eu

: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in Project 1/.env}"
: "${PROJECTION_API_PASSWORD:?Set PROJECTION_API_PASSWORD in Project 1/.env}"

export PGPASSWORD="$POSTGRES_PASSWORD"

psql_admin() {
    psql -X -v ON_ERROR_STOP=1 \
        -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB"

if [ "$(psql_admin -Atc "SELECT to_regclass('public.countries') IS NOT NULL")" = "t" ]; then
    echo "public.countries already exists; refusing to re-import. Inspect the database before retrying." >&2
    exit 1
fi

psql_admin --file=/database/00_enable_postgis.sql

ogr2ogr -f PostgreSQL \
    "PG:host=${POSTGRES_HOST} port=${POSTGRES_PORT} dbname=${POSTGRES_DB} user=${POSTGRES_USER}" \
    /data/ne_110m_admin_0_countries.geojson \
    ne_110m_admin_0_countries \
    -nln public.countries \
    -nlt PROMOTE_TO_MULTI \
    -select NE_ID,ADMIN,ADM0_A3,NAME,CONTINENT \
    -lco FID=ogc_fid \
    -lco GEOMETRY_NAME=geom \
    -lco SPATIAL_INDEX=GIST

psql_admin --file=/database/01_prepare_countries.sql
psql_admin --file=/database/03_create_api_role.sql
psql_admin --file=/database/04_create_country_area_stats.sql
