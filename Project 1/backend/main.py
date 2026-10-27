from fastapi import FastAPI, HTTPException
from psycopg.errors import UndefinedTable

from database import connect_database

from country_areas import read_table, to_response

app = FastAPI()


@app.get("/health")
async def root():
    return {"status": "ok"}


@app.get("/countries/count")
def get_country_count():
    with connect_database() as connection:
        row = connection.execute("SELECT COUNT(*) from public.countries").fetchone()
        return {"count": row[0]}


@app.get("/countries")
def get_countries():
    with connect_database() as connection:
        row = connection.execute("""
            SELECT json_build_object(
                'type', 'FeatureCollection',
                'features', COALESCE(
                    json_agg(
                        ST_AsGeoJSON(country.*, geom_column => 'geom')::json
                        ORDER BY country.adm0_a3
                    ),
                    '[]'::json
                )
            )
            FROM (
                SELECT admin, adm0_a3, geodesic_area_m2, geom
                FROM public.countries
            ) AS country;
            """).fetchone()
        return row[0]


def read_area_stats(code=None):
    try:
        rows = read_table(code)
    except UndefinedTable:
        rows = None
    if rows is None or (code is None and not rows):
        raise HTTPException(
            503, "Country area statistics have not been computed; run country_areas.py compute"
        )
    return rows


@app.get("/countries/areas")
def get_country_areas():
    return [to_response(row) for row in read_area_stats()]


@app.get("/countries/{adm0_a3}/areas")
def get_country_area(adm0_a3: str):
    rows = read_area_stats(adm0_a3.upper())
    if not rows:
        raise HTTPException(404, f"No area statistics for country code {adm0_a3!r}")
    return to_response(rows[0])
