# Projection Lab Backend

FastAPI serves PostGIS country GeoJSON and projection-area statistics for all 177 countries. The frontend accesses it through Vite's `/api` development proxy.

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

Compose waits for PostGIS to be healthy before starting the API, and the frontend waits for the API health check. The API listens on port 8000 inside the Compose network and is also published locally at <http://127.0.0.1:8000>. For the full bootstrap and end-to-end workflow, see the [Project 1 guide](../../README.md#run-the-map).

The connection settings are centralized in [database.py](database.py). Environment variables override the local defaults: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and optional `DB_PASSWORD`. This lets the HTTP endpoints and the country calculation CLI use the same settings. The CLI writes the table as `postgres`, by setting `DB_USER=postgres`. See the [database guide](../database/README.md#7-precomputed-country-area-statistics).

## Endpoints

| GET path               | Response                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `/health`              | `{"status":"ok"}`; process health only, no database check                                            |
| `/countries/count`     | `{"count":177}` from a database query                                                                |
| `/countries`           | FeatureCollection with 177 Features; properties `admin`, `adm0_a3`, `geodesic_area_m2`               |
| `/countries/areas`     | List of 177 country area records, ordered by `adm0_a3`, read from `public.country_area_stats`        |
| `/countries/{adm0_a3}/areas` | One record (case-insensitive code). 404 for an unknown code. `/countries/GRL/areas` still works through this route |

[main.py](main.py) uses synchronous `def` database routes, which FastAPI dispatches through its thread pool. Each request opens a connection with a five-second connection timeout and closes it through a context manager. This timeout is not a query or computation timeout. No connection pool or cache is configured.

The area endpoints only read precomputed rows; they never calculate during a request. A missing or empty table returns HTTP 503 with a hint to run `country_areas.py compute`. Each record is a **superset of the original Greenland response**: the same keys (`country_code`, `sphere_radius_m`, `spherical_reference_area_m2`, `ellipsoidal_area_m2`, `max_segment_length_m`, `boundary_model`, `ratio_reference`, and per projection `area_m2`, `area_ratio`, `relative_change_from_10km`, `crs`), plus these:

- `admin`
- `unclipped_spherical_area_m2`
- `relative_change_20_to_10km`
- `centroid_latitude_deg`
- `latitude_range_deg`
- `sec2_at_centroid`
- `merc_ratio_over_sec2`
- `clipping` (`is_clipped`, `latitude_limit_deg`, `clipped_area_fraction`)
- `status`

Path parameters and errors follow the FastAPI docs on [path parameters](https://fastapi.tiangolo.com/tutorial/path-params/) and [handling errors](https://fastapi.tiangolo.com/tutorial/handling-errors/).

The country SQL uses `ST_AsGeoJSON(record)`, casts its text result to `json`, aggregates in country-code order, and supplies `[]` for an empty collection. Psycopg decodes the JSON into Python objects; FastAPI serializes them without an extra JSON-encoding step. Coordinates are longitude/latitude in EPSG:4326. Winding is intentionally preserved for D3 (clockwise exteriors), not normalized to RFC 7946's counterclockwise-exterior recommendation.

## Country Method

[country_areas.py](country_areas.py) generalises the original single-country (Greenland) script to every country. It was renamed from `greenland_areas.py` on 2026-10-27. The pure calculation, `calculate_country_areas()`, takes a Shapely geometry and has no database access, so pytest can test it directly. Database loading and the command-line interface are separate functions in the same module.

1. Read each database geometry at 15 decimal places, plus the stored WGS 84 ellipsoidal area. No database geometry is modified.
2. Orient an in-memory copy with counterclockwise exteriors, so pyproj's signed geodesic area is positive. Holes keep the opposite winding.
3. Interpret the same longitude/latitude vertices on a sphere of radius **6,371,007.1809 m**, approximately the WGS 84 authalic radius. This deliberately switches to a different Earth model; it is not a transformation into another measured datum.
4. Use `Geod(a=RADIUS, f=0)` for the spherical reference area and for great-circle interpolation of every boundary, including holes and every MultiPolygon part.
5. Densify boundaries to maximum segment lengths of 20, 10 and 5 km. Project them with `+proj=merc` and `+proj=eck4`, using the same `+R`, metre units, central meridian zero and unit scale. `always_xy=True` keeps longitude/latitude order.
6. Shapely measures the projected polygons in square metres. Each projected area is divided by the spherical reference area. Both relative changes are stored, 20→10 km and 10→5 km. The 5 km result counts as converged when the 10→5 km change is below `1e-5`.
7. **Failures are recorded, not raised.** `status` is `ok`, or a comma-separated list of: `<proj>_not_converged`, `eck4_ratio_outside_tolerance` (|ratio − 1| ≥ 1e-5), `merc_ratio_not_above_1`, `<proj>_invalid_geometry` (the projected 5 km geometry is not valid) and `<proj>_invalid_area_<n>km`. Invalid *input* geometry, and geometry lying entirely beyond the Mercator limit, still raise `ValueError`.

**Poles (Antarctica).** At ±90° Mercator area is infinite. Geometry beyond ±85.0511° (atan(sinh π), the Web Mercator limit) is clipped. The clip runs only in latitude, with `shapely.clip_by_rect` at x = ±360, so densified edges on ±180° are kept. The clip happens after great-circle densification, and the new clip edge is densified *along the parallel*, because a parallel is not a great circle. The reference area and both projected areas are measured on the same clipped geometry, so the ratio covers one consistent region. The table stores `is_clipped`, `unclipped_spherical_area_m2` and `clipped_area_fraction`. In Natural Earth 1:110m only Antarctica exceeds the limit (it reaches −90°). 92.27% of its spherical area remains after clipping.

**Antimeridian.** Natural Earth already splits Fiji, Russia and Antarctica at ±180°, and `Geod.npts` keeps ±180 on the meridian. A test confirms that a box against 180° gives the same ratios as the same box shifted to 0°.

**Centroid latitude.** φc = asin(ȳ / R), where ȳ is the planar centroid of the 5 km geometry in the spherical cylindrical equal-area projection (`+proj=cea`). That projection preserves area and has y = R sin φ, so φc is asin of the area-weighted mean of sin φ. Longitude does not enter, which makes it safe across the antimeridian. A planar lon/lat centroid would be biased toward the poles, because degree cells shrink there. `sec2_at_centroid` = sec²(φc) is the theoretical Mercator area scale factor on the sphere at that latitude ([Snyder 1987, ch. 7](https://pubs.usgs.gov/pp/1395/report.pdf)).

Greenland goes through exactly the same code path as before. Run against the native database, all 15 fields of the original Greenland response were bit-for-bit equal to the output of the old script, which was saved before the rename. The Compose API, running Linux builds of PROJ/GEOS, differed from the native Windows result only in the last digits (about 1e-15 relative).

Standalone use, from this directory:

```powershell
uv run --locked country_areas.py compute --dry-run --only GRL ATA   # print, no write
uv run --locked pytest                                               # unit tests
uv run --locked country_areas.py export                              # table -> results/ and static JSON
```

`export` reads `public.country_area_stats`, through the `projection_api` role by default, and writes three files:

- [../results/country_areas.csv](../results/country_areas.csv): one row per country, with the table columns at full float precision.
- [../frontend/public/data/country_areas.json](../frontend/public/data/country_areas.json): the same records in the API response shape, prepared for a later static GitHub Pages mode. The frontend does not use it yet.
- [../results/summary.md](../results/summary.md): every number in it is computed from the rows. It covers median and maximum inflation, the five most and least inflated countries, the Eckert IV residual, how far each ratio sits from sec²(φc), and the reasons for the gap.

The 2026-10-27 export was made from the native database. Its headline numbers were cross-checked against an independent SQL query: n = 176 excluding ATA, median 1.2063, maximum 16.5433, minimum 1.0007, median ratio/sec² 1.0010, minimum 1.000010, 156 within 1% and 169 within 10%, Eckert IV worst 2.486e-6. They matched.

| Measurement (Greenland)   | Area (square kilometers) |   Ratio to spherical area |
| ------------------------- | -----------------------: | ------------------------: |
| WGS 84 ellipsoid, PostGIS |            2,206,644.439 | Not the ratio denominator |
| Spherical reference       |            2,189,750.321 |                         1 |
| Spherical Mercator        |           36,225,613.004 |               16.54326187 |
| Spherical Eckert IV       |            2,189,749.778 |                0.99999975 |

These values were observed from the current generalized Greenland geometry. Final relative area changes (10 km to 5 km) were approximately `6.45097e-6` for Mercator and `5.87293e-7` for Eckert IV. Passing these checks is numerical convergence evidence, not a guarantee of surveyed boundary accuracy or an exhaustive error bound.

**Sudan.** All 177 countries converged. Sudan is the only country whose status is not `ok`: `merc_invalid_geometry,eck4_invalid_geometry`. Its generalised ring contains a narrow spike near (24.57° E, 8.23° N): (23.806, 8.666) → (24.567, 8.229) → (23.887, 8.620). The ring is valid as straight lon/lat lines. Once the outgoing and returning edges are treated as great circles, though, they cross. Repairing the projected 5 km polygons with `shapely.make_valid` changed the measured area by 4.95e-7 (Mercator) and 5.26e-7 (Eckert IV) relative, both far below the 1e-5 tolerance. The flag is kept so the result is not hidden; Sudan's ratios are still reported and included in the statistics.

### Tests

[tests/test_country_areas.py](tests/test_country_areas.py) uses pytest ([getting started](https://docs.pytest.org/en/stable/getting-started.html)), installed as a uv [development dependency](https://docs.astral.sh/uv/concepts/projects/dependencies/#development-dependencies). The Docker image is built with `--no-dev`, so pytest is not installed there. The tests cover:

- the octant triangle (0,0), (90,0), (0,90), whose area is exactly πR²/2;
- the Eckert IV ratio of a 10°×10° box, which is 1 within 1e-5;
- 0.1° boxes at 0/30/45/60/75°, whose Mercator ratio is sec²φ within 1e-3;
- a 10–70° box, whose ratio exceeds sec²(φc), as Jensen's inequality requires;
- antimeridian symmetry;
- a polar cap reaching −90°, which is clipped and flagged, and whose area equals the zone formula 2πR²(sin φ₂ − sin φ₁) within 1e-5;
- geometry entirely beyond the limit, which is rejected;
- a Greenland regression against the static GeoJSON.

[conftest.py](conftest.py) lets the repository-root command in CLAUDE.md find the module:

```powershell
uv run --locked --project "Project 1/backend" pytest
```

### Interpreting the Comparison

The ellipsoid is slightly flattened; the sphere is a different Earth model. Their Greenland areas differ by approximately 16,894 square kilometers (about 0.77% of the ellipsoidal area). That difference is not an Eckert IV projection error.

Mercator preserves local angles but greatly enlarges high-latitude areas. Greenland's projected area is about **16.54 times** its spherical area, or about **1,554% larger**. Eckert IV preserves spherical area: its computed result is only about **0.543 square kilometers** below the spherical reference, a small numerical discrepancy from approximating curved projected edges with line segments. Equal area does not mean equal shape or angles.

These are physical-coordinate projection calculations, not pixel measurements. D3 uses the same families of spherical endpoint projections, but fits every blend independently and has its own adaptive rendering approximation. The backend does not calculate intermediate blends; linear interpolation of the endpoint area ratios would be unjustified. Greenland is below the frontend's Mercator latitude cap. Polar and antimeridian handling is described in the country method above. Africa is educational context only; no Africa statistic was calculated today.

## Verification and Remaining Work

On 2026-09-21 the learner verified the dedicated login, the 177-row Python query, the original four HTTP endpoints, SQL GeoJSON structure and winding, and the frontend API integration.

The agent ran these checks on 2026-10-27:

- **Native database, via FastAPI's TestClient:**
  - `/countries/areas` returned 200 with 177 records (AFG … ZWE).
  - `/countries/GRL/areas` matched all 15 fields of the saved pre-change Greenland response exactly.
  - `/countries/grl/areas` returned 200; `/countries/XXX/areas` returned 404.
  - A simulated missing table returned 503.
- **Compose, over HTTP after rebuilding `api`:**
  - 177 records, and 177 through Nginx at `:8080/api/countries/areas`.
  - GRL Mercator 16.543261873210074 and Eckert IV 0.9999997520352765, identical to the Compose response before the change.
  - `grl` returned 200 and `XXX` 404.
- `uv run --locked --project "Project 1/backend" pytest`: 12 passed.

Remaining work:

- Other database failures still return a generic HTTP 500.
- There is no connection pool and no intermediate-blend calculation.
- A fresh-volume Compose replay (`bootstrap` + `areas` + app) was verified on 2026-10-27 and matches the CSV to within 1.1e-13 relative. See the [database guide](../database/README.md#fresh-volume-replay).

## Official References

- [uv projects](https://docs.astral.sh/uv/guides/projects/)
- [FastAPI first steps](https://fastapi.tiangolo.com/tutorial/first-steps/) and [synchronous routes](https://fastapi.tiangolo.com/async/)
- [Psycopg usage](https://www.psycopg.org/psycopg3/docs/basic/usage.html) and [JSON adaptation](https://www.psycopg.org/psycopg3/docs/basic/adapt.html#json-adaptation)
- [PostGIS ST_AsGeoJSON](https://postgis.net/docs/ST_AsGeoJSON.html)
- [pyproj Geod](https://pyproj4.github.io/pyproj/stable/api/geod.html) and [Transformer](https://pyproj4.github.io/pyproj/stable/api/transformer.html)
- [Shapely transform](https://shapely.readthedocs.io/en/stable/reference/shapely.transform.html) and [clip_by_rect](https://shapely.readthedocs.io/en/stable/reference/shapely.clip_by_rect.html)
- PROJ [Mercator](https://proj.org/en/stable/operations/projections/merc.html), [Eckert IV](https://proj.org/en/stable/operations/projections/eck4.html) and [cylindrical equal area](https://proj.org/en/stable/operations/projections/cea.html)
- [pytest](https://docs.pytest.org/en/stable/getting-started.html) and [uv development dependencies](https://docs.astral.sh/uv/concepts/projects/dependencies/#development-dependencies)
- Snyder, *Map Projections: A Working Manual* ([USGS PP 1395](https://pubs.usgs.gov/pp/1395/report.pdf)), for the Mercator scale factor sec φ
