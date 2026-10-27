from fastapi import FastAPI

from database import connect_database

from shapely.geometry import shape

from country_areas import calculate_country_areas, load_countries, to_response

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


@app.get("/countries/GRL/areas")
def get_greenland_areas():
    code, admin, geojson, ellipsoidal = load_countries(["GRL"])[0]
    return to_response(calculate_country_areas(code, admin, shape(geojson), ellipsoidal))
