# Database Setup and Verification

PostgreSQL/PostGIS supplies country geometry and ellipsoidal areas to FastAPI through a restricted role. The browser reads the API, never the database directly. The database can run as a native Windows installation or in Docker Compose. Projection-area statistics for all 177 countries are calculated once in Python and stored in `public.country_area_stats`.

## Docker Compose Workflow

The verified local Compose setup uses PostgreSQL 18/PostGIS 3.6, a GDAL one-shot bootstrap image, FastAPI, and an Nginx-served frontend. It publishes the web app at `127.0.0.1:8080`, the API at `127.0.0.1:8000`, and the database at `127.0.0.1:5433`. Container-to-container connections use Compose service names and the internal database port `5432`.

From the repository root, create the private environment file from the example and replace both placeholders with private local development passwords. Do not commit or share `.env`:

```powershell
Copy-Item "Project 1/.env.example" "Project 1/.env"
```

Initialize and populate a new container database:

```powershell
docker compose --env-file "Project 1/.env" -f "Project 1/compose.yaml" up -d db
docker compose --env-file "Project 1/.env" -f "Project 1/compose.yaml" --profile setup run --build --rm bootstrap
```

The explicit `setup` profile imports the versioned Natural Earth GeoJSON with `ogr2ogr`, runs `00_enable_postgis.sql` and `01_prepare_countries.sql`, then creates the read-only `projection_api` role using `03_create_api_role.sql`. The bootstrap checks for `public.countries` first and exits rather than overwriting an existing table. It is not run automatically on normal startup. If it fails partway through, inspect the database before retrying; do not run a fresh import blindly.

Start the application after bootstrap succeeds:

```powershell
docker compose --env-file "Project 1/.env" -f "Project 1/compose.yaml" up -d --build web
```

Open <http://127.0.0.1:8080>. The Compose named volume preserves database contents when containers stop or are recreated. `docker compose down` retains the volume; `docker compose down -v` deletes it and all database contents. The current container database and API role were verified with 177 valid countries and read-only API privileges. A full independent fresh-volume replay has not been performed.

For the frontend and API details, see the [project guide](../../README.md#run-the-map), [backend guide](../backend/README.md#run-in-docker-compose), and [frontend guide](../frontend/README.md#run-the-full-app-in-docker).

## Current State and Evidence

The learner ran and verified the individual setup, import, repair, and area statements in `projection_lab` on 2026-09-09:

- PostgreSQL 18.6; PostGIS 3.6.2; GDAL 3.13.3 via OSGeo4W. QGIS is installed; its version has not been recorded.
- `public.countries`: 177 rows, `ogc_fid` primary key, `geom geometry(MultiPolygon,4326)`, and a GiST geometry index.
- Retained attributes: `ne_id`, `admin`, `adm0_a3`, `name`, and `continent`.
- USA and Sudan self-intersections repaired with default `ST_MakeValid`; all 177 geometries subsequently valid, nonempty, and non-null.
- `geodesic_area_m2`: a stored generated `double precision` column using `ST_Area(geom::geography)`; 177 positive, finite values.
- Greenland: approximately 2,206,644.4394 square kilometers.
- Berlin point (13.405, 52.52): Germany (`DEU`). The observed plan used `countries_geom_geom_idx`, rejected one bounding-box candidate during `ST_Covers`, and returned one row. Execution time was 0.110 ms for that run, not a benchmark.

The scripts below consolidate that work and add transactional guard checks. On 2026-10-27 the Compose bootstrap executed `00`, `01`, `03` and `04` on a fresh, empty volume; see [Fresh-Volume Replay](#fresh-volume-replay). The native, OSGeo4W-based sequence below has not been replayed end to end. Do not rerun the preparation script on the already-prepared database; use only the read-only verification script there. No live database was changed when these files were added.

## Prerequisites and Secrets

Install [PostgreSQL for Windows](https://www.postgresql.org/download/windows/), [matching PostGIS binaries](https://postgis.net/documentation/getting_started/install_windows/), and [QGIS/GDAL through OSGeo4W](https://qgis.org/download/). Enable neither all PostGIS raster GDAL drivers nor out-of-database rasters for this vector project.

Use **OSGeo4W Shell (cmd.exe)** for the shell commands below. Start it in the repository root. GDAL commands should be available there. `psql` may require its full installation path, for example `"C:\Program Files\PostgreSQL\18\bin\psql.exe"`, in place of `psql`. Check your actual installation location.

Authentication uses libpq's [password file](https://www.postgresql.org/docs/current/libpq-pgpass.html) at `%APPDATA%\postgresql\pgpass.conf`, outside the repository. It must be plain text, not a hidden `.conf.txt` file. Store a private entry matching `localhost`, port `5432`, database `projection_lab`, and the setup user `postgres`; escape colons and backslashes in the password as documented. Prefer UTF-8 without a BOM. Never put the password in a command, SQL file, repository note, or chat. Restrict access to this plaintext credential file.

These instructions use `postgres` only for local setup. The application uses `projection_api`, created and verified by the learner on 2026-09-21 as documented below. Do not use the administrator account in the application. Adjust the port consistently if your installation differs.

Check GDAL and the required drivers:

```bat
ogr2ogr --version
ogr2ogr --formats | findstr /I "PostgreSQL GeoJSON"
```

## 1. Create a Fresh Database

In SQL Shell (`psql`), connected to the default `postgres` database as an administrator, run each command separately:

```sql
CREATE DATABASE projection_lab;
```

```text
\connect projection_lab
```

Stop if that database already exists. Do not drop the existing database to reproduce this exercise. A separate replay database would require changing the connection commands and adding a matching private password-file entry.

From OSGeo4W Shell at the repository root, enable the extension:

```bat
psql -X -w -h localhost -p 5432 -U postgres -d projection_lab -f "Project 1/database/00_enable_postgis.sql"
```

`-X` ignores local psql startup customization, and `-w` fails instead of prompting when password-file authentication is unavailable. Each SQL script stops on error with `ON_ERROR_STOP`.

## 2. Inspect and Import the Versioned Source

Use the repository's [Natural Earth GeoJSON](../frontend/public/data/ne_110m_admin_0_countries.geojson), not a new download that may have changed:

```bat
ogrinfo -al -so "Project 1/frontend/public/data/ne_110m_admin_0_countries.geojson"
```

Expected source: layer `ne_110m_admin_0_countries`, 177 features, WGS 84 / EPSG:4326, and extent (-180, -90) to (180, 83.64513). Mixed Polygon/MultiPolygon data is reported as `Unknown (any)`. The data axis mapping `2,1` means actual coordinate order is longitude, latitude; do not swap coordinates.

Run the import once into an absent `public.countries` table:

```bat
ogr2ogr -f PostgreSQL ^
  "PG:host=localhost port=5432 dbname=projection_lab user=postgres" ^
  "Project 1/frontend/public/data/ne_110m_admin_0_countries.geojson" ^
  ne_110m_admin_0_countries ^
  -nln public.countries ^
  -nlt PROMOTE_TO_MULTI ^
  -select NE_ID,ADMIN,ADM0_A3,NAME,CONTINENT ^
  -lco GEOMETRY_NAME=geom ^
  -lco SPATIAL_INDEX=GIST
```

The caret is cmd.exe line continuation; there must be no trailing spaces after it. This is not PowerShell syntax. There is no `-overwrite`, `-append`, or `-skipfailures`: stop on any error and inspect the database before retrying. Authentication failures may be followed by misleading database-creation errors; resolve the first error rather than recreating the database.

The source CRS is retained without reprojection. `PROMOTE_TO_MULTI` wraps Polygon features as MultiPolygons. In the observed import, all values were MultiPolygon but the column was generic `geometry(Geometry,4326)`; the preparation script explicitly tightens that column. Attribute names are lowercased by the driver. `ogc_fid` is import-generated, not a stable cross-import country identifier.

## 3. Prepare and Validate Geometries and Areas

For the freshly imported table only:

```bat
psql -X -w -h localhost -p 5432 -U postgres -d projection_lab -f "Project 1/database/01_prepare_countries.sql"
```

[01_prepare_countries.sql](01_prepare_countries.sql) runs in one transaction. It checks the count, type, SRID, missing/empty values, and expected repair targets; restricts the column to MultiPolygon/4326; repairs only invalid `USA` and `SDN` features; validates the result; and adds and verifies the stored generated area column. Unexpected invalid features cause failure instead of automatic repair. A repair yielding an incompatible geometry type also fails rather than discarding components.

The stable source codes were checked against the GeoJSON: USA has `NE_ID` 1159321369 and Sudan 1159321229. Their initial import-generated IDs were 5 and 15, but the script does not depend on those IDs. The source file remains unchanged; validity repair does not establish authoritative boundary accuracy.

The preparation script intentionally is not an idempotent migration. An existing area column causes an error, rolling back this invocation instead of silently trusting an unknown schema. With the command above, psql exits on error and its uncommitted transaction is rolled back. If you instead run a script via `\i` in an interactive session and it fails, execute `ROLLBACK;` before continuing.

The import and preparation are separate steps: a failed preparation leaves the imported table in place. Inspect it; do not blindly rerun the import.

## 4. Verify Without Modifying Data

This step can also be run against the current prepared database:

```bat
psql -X -w -h localhost -p 5432 -U postgres -d projection_lab -f "Project 1/database/02_verify_countries.sql"
```

[02_verify_countries.sql](02_verify_countries.sql) uses a read-only transaction and prints the quality counts, actual geometry types/SRIDs, table definition, indexes, Greenland area, Berlin result, and execution plan. Review the output; this script reports checks rather than asserting their expected values.

Expected counts: total 177, missing/empty/invalid 0, populated areas 177, positive finite areas 177. Verify MultiPolygon/4326, a primary key, and a GiST index. Greenland should match the value above within floating-point tolerance. Berlin should return Germany/DEU.

The observed plan used a bounding-box index condition followed by an exact `ST_Covers` filter. Another valid plan, including a sequential scan, may be chosen for a small table. Do not force an index or expect identical timings. `EXPLAIN ANALYZE` executes its statement; all statements in this verification script are read-only.

## 5. API Role and Verification

The following setup was run interactively on 2026-09-21. Do not recreate the already-existing role. Roles are cluster-wide, not confined to one database. On a fresh setup, connect SQL Shell (psql) as the administrator to `projection_lab` and run:

```sql
CREATE ROLE projection_api
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
```

Set its password with this psql command (no semicolon), entering the secret privately at both prompts:

```text
\password projection_api
```

Grant access to the existing table only:

```sql
GRANT CONNECT ON DATABASE projection_lab TO projection_api;
GRANT USAGE ON SCHEMA public TO projection_api;
GRANT SELECT ON TABLE public.countries TO projection_api;
```

Read-only checks, also safe on the existing setup:

```sql
SELECT rolname, rolcanlogin, rolsuper, rolcreatedb,
     rolcreaterole, rolreplication, rolbypassrls
FROM pg_roles WHERE rolname = 'projection_api';

SELECT
  has_database_privilege('projection_api', 'projection_lab', 'CONNECT') AS can_connect,
  has_schema_privilege('projection_api', 'public', 'USAGE') AS can_use_schema,
  has_table_privilege('projection_api', 'public.countries', 'SELECT') AS can_read,
  has_table_privilege('projection_api', 'public.countries', 'INSERT,UPDATE,DELETE,TRUNCATE') AS has_table_write_privilege,
  has_schema_privilege('projection_api', 'public', 'CREATE') AS can_create_in_public;
```

Observed: login true, all listed administrative flags false; effective privileges `true, true, true, false, false`. The comma-separated table check tests whether any listed privilege is present. These checks include inherited permissions but are not a cluster-wide security audit: default `PUBLIC` rights, such as temporary-table access, have not been broadly revoked. No role ownership, memberships, or global permissions should be changed just to reproduce these checks.

Open a separate SQL Shell session with server `localhost`, database `projection_lab`, port `5432`, user `projection_api`, and the role's private password. Verify:

```sql
SELECT current_user, current_database(), COUNT(*) AS country_count
FROM public.countries;
```

Observed: `projection_api | projection_lab | 177`. For Python, add a specific `localhost:5432:projection_lab:projection_api` credential entry to the existing external password file. Its final field is the password, entered only in that local file. Preserve existing entries, escape colons/backslashes, and put the specific entry before a matching wildcard entry. Do not include credentials in SQL, shell arguments, repository files, or chat. The learner verified the same identity/database/count through Psycopg without a password in Python source.

## 6. GeoJSON Export Checks

These read-only queries were learner-verified as `projection_api`:

```sql
SELECT admin, adm0_a3, ST_AsGeoJSON(geom)
FROM public.countries WHERE adm0_a3 = 'DEU';

SELECT ST_IsPolygonCW(geom) AS exterior_cw_holes_ccw, COUNT(*)
FROM public.countries GROUP BY ST_IsPolygonCW(geom);

SELECT ST_AsGeoJSON(country.*, geom_column => 'geom')
FROM (
  SELECT admin, adm0_a3, geodesic_area_m2, geom
  FROM public.countries WHERE adm0_a3 = 'DEU'
) AS country;
```

Germany exported as a MultiPolygon and then a Feature with the three selected properties. All 177 geometries passed the clockwise-exterior/counterclockwise-hole check. This matches D3's convention for small spherical polygons, not RFC 7946's recommended exterior winding; the API preserves it intentionally. Neither export nor inspection modifies stored data.

The [API query](../backend/main.py) casts each Feature's text to `json`, aggregates in country-code order, and wraps the result in a FeatureCollection. The learner's compact SQL check returned `FeatureCollection | 177 | object | Feature`; the empty-array fallback was not separately tested against an empty database. API-backed rendering, including the repaired geometries, was subsequently learner-verified at both projection endpoints and the midpoint.

## 7. Precomputed Country Area Statistics

[04_create_country_area_stats.sql](04_create_country_area_stats.sql) creates `public.country_area_stats` and grants `SELECT` on it to `projection_api`. It has one row per country: spherical, clipped and ellipsoidal areas, Mercator and Eckert IV areas and ratios, the 20→10 and 10→5 km convergence changes, centroid latitude, latitude range, sec²(φc), the clipping flag and fraction, and `status`. The table is filled by the backend CLI, connected as an administrator, because the API role is read-only. Each run replaces every row inside one transaction. Calculation happens once, not per request.

Native (OSGeo4W Shell or PowerShell, from the repository root; the passwords come from `pgpass.conf`):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -X -w -h localhost -p 5432 -U postgres -d projection_lab -f "Project 1/database/04_create_country_area_stats.sql"
Set-Location "Project 1/backend"; $env:DB_USER = "postgres"; uv run --locked country_areas.py compute; Remove-Item Env:DB_USER; Set-Location ../..
```

Compose: on a fresh volume, `bootstrap` now also runs `04`. Run the `areas` setup service after bootstrap. It uses the backend image as `postgres`, with the password taken from `.env`:

```powershell
docker compose --env-file "Project 1/.env" -f "Project 1/compose.yaml" --profile setup run --build --rm areas
```

For the already-bootstrapped Compose database, `04` was piped once through `docker compose exec -T db psql`, because the bootstrap refuses to run against an existing database.

Verified on 2026-10-27:

- `04` was run on both databases (`CREATE TABLE`, `GRANT`). `has_table_privilege` gives `projection_api` SELECT = `t`, INSERT = `f`.
- `compute` wrote 177 rows to each database: native via Windows Python, Compose via the `areas` container.
- A query showed `177 | 176 ok | SDN:merc_invalid_geometry,eck4_invalid_geometry | clipped ATA`.
- The native query ran as `projection_api`.
- Greenland's Mercator ratio is `16.543261873210085` on native and `16.543261873210074` from the Linux container, which differ only in the last digits.

### Fresh-Volume Replay

Verified on 2026-10-27. The replay starts from an empty volume and runs the whole sequence: bootstrap, then the area precompute, then the app. It runs beside the existing stack and does not touch it.

- **Separate project name.** `-p projection-replay` makes Compose create a new volume, `projection-replay_projection_db_data`. The existing `project1_projection_db_data` volume and its containers were not stopped, modified or deleted.
- **Overlay file.** [compose.replay.yaml](../compose.replay.yaml) only moves the published ports to 5434 (db), 8001 (api) and 8081 (web). It uses Compose's `!override` tag, so the two stacks don't collide.

From the repository root (PowerShell):

```powershell
$c = @('compose','-p','projection-replay','--env-file','Project 1/.env','-f','Project 1/compose.yaml','-f','Project 1/compose.replay.yaml')
docker @c up -d --wait db
docker @c --profile setup run --build --rm bootstrap
docker @c --profile setup run --build --rm areas
docker @c up -d --build --wait web
docker @c down          # stops the replay; add -v only to delete its volume
```

Observed outcome:

- **Bootstrap.**
  - PostGIS 3.6.4 was enabled.
  - `01` printed the two expected self-intersection notices and repaired USA and SDN (`UPDATE 2`), then `COMMIT`.
  - `03` printed `CREATE ROLE` plus three `GRANT`s.
  - `04` printed `CREATE TABLE` / `GRANT`.
- **Precompute (`areas`):** `Computed 177 countries; 1 not ok`. SDN carried the same geometry flag and ATA was clipped (kept fraction 0.922678). It ended with `Wrote 177 rows to public.country_area_stats`.
- **App:** db, api and web were all healthy. `:8001/countries/count` returned `{"count":177}` and `/countries/GRL/areas` returned 200.
- **API (through Nginx at `:8081/api/countries/areas`) against [results/country_areas.csv](../results/country_areas.csv):**
  - The same 177 codes, with identical names, statuses and clip flags.
  - Every numeric field agrees to within a maximum relative difference of **1.1e-13**. The largest, 1.119e-13, is `sec2_at_centroid` for ATA; every area field is within 3.6e-14.
  - Exact bit-for-bit matches range from 5 to 177 of 177 per field. The CSV was exported from the native Windows database, while the replay runs Linux builds of PROJ/GEOS and PostGIS 3.6.4. Native runs PostGIS 3.6.2, which accounts for the ellipsoidal-area differences of at most 3.6e-14.
- **Replay against the existing Compose stack (Linux against Linux):** the full `/countries/areas` JSON was **identical**.

The replay's comparison script is not committed: it fetches the API, joins it to the CSV by `adm0_a3` and reports exact matches and the maximum relative difference per field. The replay volume was kept and can be deleted with `down -v` on the command above.

## Measurement Limits and Next Work

EPSG:4326 geometry area is planar and measured in square degrees. Casting to geography does not reproject coordinates; `ST_Area(geom::geography)` measures on the WGS 84 spheroid in square meters. Divide by 1,000,000 for square kilometers. Stored generated values are recalculated by PostgreSQL when their geometry changes; never update them directly.

These are ellipsoidal areas of generalized and, for two features, repaired boundaries. They are not surveyed national statistics. D3 uses spherical geometry, so its equal-area projection is not an exact ellipsoidal reference. The frontend now renders the database's repaired geometries; the original static import source remains unchanged.

Country projection statistics use a separate spherical denominator and pyproj/Shapely; see the [backend measurement method](../backend/README.md#country-method). QGIS database visualization, a full privilege audit, and an end-to-end replay of the *native* (non-Docker) setup remain unverified. No database mutations were performed by the agent during the 2026-09-21 frontend/documentation update.

## Official References

- [PostgreSQL generated columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [GDAL ogr2ogr](https://gdal.org/en/stable/programs/ogr2ogr.html) and [PostgreSQL driver](https://gdal.org/en/stable/drivers/vector/pg.html)
- [PostGIS ST_MakeValid](https://postgis.net/docs/ST_MakeValid.html), [ST_Area](https://postgis.net/docs/ST_Area.html), and [ST_Covers](https://postgis.net/docs/ST_Covers.html)
