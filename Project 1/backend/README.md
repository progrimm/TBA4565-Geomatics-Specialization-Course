# Projection Lab Backend

FastAPI serves PostGIS country GeoJSON and Greenland-only area comparisons. The frontend accesses it through Vite's `/api` development proxy. No additional country-statistics endpoints are implemented or authorized in the current scope.

## Environment and Dependencies

Requires uv and Python 3.14 or newer. The learner verified Python 3.14.7, FastAPI 0.141.1, and Psycopg 3.3.6. pyproj and Shapely provide projection, geodesic, and polygon-area operations; exact resolved versions are in [uv.lock](uv.lock).

From this directory, install the dependencies recorded in `uv.lock`:

```powershell
uv sync --locked
```

`pyproject.toml` declares direct dependencies; `uv.lock` records the resolved dependency versions. Commit both files. The local `.venv` and Python caches are ignored.

## Run Locally

PostgreSQL must be running with database `projection_lab`, table `public.countries`, and the restricted `projection_api` role. For native development, the API defaults to `localhost:5432`; libpq authentication can use the role-specific entry in `%APPDATA%\postgresql\pgpass.conf`. In Compose, the `api` service receives `DB_HOST=db`, `DB_PORT=5432`, and `DB_PASSWORD` from the ignored `Project 1/.env` file. Never embed a password in source or share the password file. See the [database setup guide](../database/README.md) for both workflows.

From this directory:

```powershell
uv run --locked fastapi dev main.py
```

Manual environment activation is not required with `uv run`. Open <http://127.0.0.1:8000/health> to verify the response, or <http://127.0.0.1:8000/docs> for interactive API documentation. Stop the server with Ctrl+C.

In VS Code, select this directory's `.venv/Scripts/python.exe` as the Python interpreter.

## Run in Docker Compose

The API image is built from this directory's Dockerfile using Python 3.14 and the committed `uv.lock`. From the repository root, start it with the database and frontend:

```powershell
docker compose --env-file "Project 1/.env" -f "Project 1/compose.yaml" up -d --build web
```

Compose waits for PostGIS to be healthy before starting the API, and the frontend waits for the API health check. The API listens on port 8000 inside the Compose network and is also published locally at <http://127.0.0.1:8000>. For the full bootstrap and end-to-end workflow, see the [Project 1 guide](../README.md#run-the-map).

The connection settings are centralized in [database.py](database.py). Environment variables override the local defaults: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and optional `DB_PASSWORD`. This lets both HTTP endpoints and the Greenland calculation use the same database settings.

## Endpoints

| GET path               | Response                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `/health`              | `{"status":"ok"}`; process health only, no database check                                            |
| `/countries/count`     | `{"count":177}` from a database query                                                                |
| `/countries`           | FeatureCollection with 177 Features; properties `admin`, `adm0_a3`, `geodesic_area_m2`               |
| `/countries/GRL/areas` | Greenland spherical/ellipsoidal areas, projection areas/ratios, CRS strings and convergence metadata |

[main.py](main.py) uses synchronous `def` database routes, which FastAPI dispatches through its thread pool. Each request opens a connection with a five-second connection timeout and closes it through a context manager. This timeout is not a query or computation timeout. No connection pool or cache is configured.

The country SQL uses `ST_AsGeoJSON(record)`, casts its text result to `json`, aggregates in country-code order, and supplies `[]` for an empty collection. Psycopg decodes the JSON into Python objects; FastAPI serializes them without an extra JSON-encoding step. Coordinates are longitude/latitude in EPSG:4326. Winding is intentionally preserved for D3 (clockwise exteriors), not normalized to RFC 7946's counterclockwise-exterior recommendation.

## Greenland Method

[greenland_areas.py](greenland_areas.py) queries only `GRL`. Its main guard permits standalone execution without running a query merely when the module is imported:

```powershell
uv run --locked greenland_areas.py
```

1. Read the database geometry at 15 decimal places and the stored WGS 84 ellipsoidal area. No database geometry is modified.
2. Orient an in-memory copy with counterclockwise exteriors so pyproj's signed geodesic area is positive; holes retain the opposite winding.
3. Interpret the same longitude/latitude vertices on a sphere of radius **6,371,007.1809 m** (approximately the WGS 84 authalic radius). This deliberately changes the Earth model, rather than transforming into a new measured datum.
4. Use `Geod(a=RADIUS, f=0)` for spherical reference area and great-circle interpolation of every boundary, including holes and every MultiPolygon part.
5. Densify boundaries to maximum segment lengths of 20, 10, and 5 km. Project them using `+proj=merc` and `+proj=eck4`, the same `+R`, meter units, default central meridian zero, and default unit scale. `always_xy=True` preserves longitude/latitude order.
6. Shapely measures the projected polygons in square meters. For each projection, divide by the spherical reference area. Retain the 5 km result only if the change from 10 km is below `1e-5` (0.001%). Also check positive finite areas, valid geometry, Eckert IV's ratio within `1e-5` of 1, and Mercator's ratio above 1.

| Measurement               | Area (square kilometers) |   Ratio to spherical area |
| ------------------------- | -----------------------: | ------------------------: |
| WGS 84 ellipsoid, PostGIS |            2,206,644.439 | Not the ratio denominator |
| Spherical reference       |            2,189,750.321 |                         1 |
| Spherical Mercator        |           36,225,613.004 |               16.54326187 |
| Spherical Eckert IV       |            2,189,749.778 |                0.99999975 |

These values were observed from the current generalized Greenland geometry. Final relative area changes (10 km to 5 km) were approximately `6.45097e-6` for Mercator and `5.87293e-7` for Eckert IV. Passing these checks is numerical convergence evidence, not a guarantee of surveyed boundary accuracy or an exhaustive error bound.

### Interpreting the Comparison

The ellipsoid is slightly flattened; the sphere is a different Earth model. Their Greenland areas differ by approximately 16,894 square kilometers (about 0.77% of the ellipsoidal area). That difference is not an Eckert IV projection error.

Mercator preserves local angles but greatly enlarges high-latitude areas. Greenland's projected area is about **16.54 times** its spherical area, or about **1,554% larger**. Eckert IV preserves spherical area: its computed result is only about **0.543 square kilometers** below the spherical reference, a small numerical discrepancy from approximating curved projected edges with line segments. Equal area does not mean equal shape or angles.

These are physical-coordinate projection calculations, not pixel measurements. D3 uses the same families of spherical endpoint projections, but fits every blend independently and has its own adaptive rendering approximation. The backend does not calculate intermediate blends; linear interpolation of the endpoint area ratios would be unjustified. Greenland is below the frontend's Mercator latitude cap. This script must not be generalized to polar or antimeridian-crossing countries without additional handling. Africa is educational context only; no Africa statistic was calculated today.

## Verification and Remaining Work

On 2026-09-21 the learner verified the dedicated login, 177-row Python query, all four HTTP endpoints, SQL GeoJSON structure/winding, and frontend API integration. The agent also read the live Greenland response and confirmed the values above. The standalone calculation raises explicit exceptions on failed numerical checks; it has no committed automated test suite yet.

Database failures and calculation exceptions still return generic HTTP 500 responses. Error handling, connection management, and automated regression coverage remain hardening work. The Compose production frontend uses Nginx for static files and API routing. There is no general country-statistics endpoint or intermediate-blend calculation. A complete independent fresh-volume bootstrap replay remains unverified.

## Official References

- [uv projects](https://docs.astral.sh/uv/guides/projects/)
- [FastAPI first steps](https://fastapi.tiangolo.com/tutorial/first-steps/) and [synchronous routes](https://fastapi.tiangolo.com/async/)
- [Psycopg usage](https://www.psycopg.org/psycopg3/docs/basic/usage.html) and [JSON adaptation](https://www.psycopg.org/psycopg3/docs/basic/adapt.html#json-adaptation)
- [PostGIS ST_AsGeoJSON](https://postgis.net/docs/ST_AsGeoJSON.html)
- [pyproj Geod](https://pyproj4.github.io/pyproj/stable/api/geod.html) and [Transformer](https://pyproj4.github.io/pyproj/stable/api/transformer.html)
- [Shapely transform](https://shapely.readthedocs.io/en/stable/reference/shapely.transform.html)
