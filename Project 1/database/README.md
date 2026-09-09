# Database Setup and Verification

Phase 3 uses a native Windows PostgreSQL/PostGIS installation. The frontend still reads its static GeoJSON; it does not connect to this database. FastAPI integration is Phase 4, and Docker Compose is Phase 5.

## Current State and Evidence

The learner ran and verified the individual setup, import, repair, and area statements in `projection_lab` on 2026-09-09:

- PostgreSQL 18.6; PostGIS 3.6.2; GDAL 3.13.3 via OSGeo4W. QGIS is installed; its version has not been recorded.
- `public.countries`: 177 rows, `ogc_fid` primary key, `geom geometry(MultiPolygon,4326)`, and a GiST geometry index.
- Retained attributes: `ne_id`, `admin`, `adm0_a3`, `name`, and `continent`.
- USA and Sudan self-intersections repaired with default `ST_MakeValid`; all 177 geometries subsequently valid, nonempty, and non-null.
- `geodesic_area_m2`: a stored generated `double precision` column using `ST_Area(geom::geography)`; 177 positive, finite values.
- Greenland: approximately 2,206,644.4394 square kilometers.
- Berlin point (13.405, 52.52): Germany (`DEU`). The observed plan used `countries_geom_geom_idx`, rejected one bounding-box candidate during `ST_Covers`, and returned one row. Execution time was 0.110 ms for that run, not a benchmark.

The scripts below consolidate that work and add transactional guard checks. They have not been executed as a complete fresh-database replay. Do not rerun the preparation script on the already-prepared database; use only the read-only verification script there. No live database was changed when these files were added.

## Prerequisites and Secrets

Install [PostgreSQL for Windows](https://www.postgresql.org/download/windows/), [matching PostGIS binaries](https://postgis.net/documentation/getting_started/install_windows/), and [QGIS/GDAL through OSGeo4W](https://qgis.org/download/). Enable neither all PostGIS raster GDAL drivers nor out-of-database rasters for this vector project.

Use **OSGeo4W Shell (cmd.exe)** for the shell commands below. Start it in the repository root. GDAL commands should be available there. `psql` may require its full installation path, for example `"C:\Program Files\PostgreSQL\18\bin\psql.exe"`, in place of `psql`. Check your actual installation location.

Authentication uses libpq's [password file](https://www.postgresql.org/docs/current/libpq-pgpass.html) at `%APPDATA%\postgresql\pgpass.conf`, outside the repository. It must be plain text, not a hidden `.conf.txt` file. Store a private entry matching `localhost`, port `5432`, database `projection_lab`, and the setup user `postgres`; escape colons and backslashes in the password as documented. Prefer UTF-8 without a BOM. Never put the password in a command, SQL file, repository note, or chat. Restrict access to this plaintext credential file.

These instructions use `postgres` only for local setup. Create a dedicated least-privilege API role in Phase 4; do not use this administrator account in the application. Adjust the port consistently if your installation differs.

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

## Measurement Limits and Next Work

EPSG:4326 geometry area is planar and measured in square degrees. Casting to geography does not reproject coordinates; `ST_Area(geom::geography)` measures on the WGS 84 spheroid in square meters. Divide by 1,000,000 for square kilometers. Stored generated values are recalculated by PostgreSQL when their geometry changes; never update them directly.

These are ellipsoidal areas of generalized and, for two features, repaired boundaries. They are not surveyed national statistics. D3 uses spherical geometry, so its equal-area projection is not an exact ellipsoidal reference. The database repairs are not yet reflected in the frontend's unchanged static source; Phase 4 will switch rendering to the API's database-backed GeoJSON and check polygon winding and CRS compatibility.

Next: a least-privilege database role, FastAPI endpoints, PostGIS GeoJSON export, and a clearly defined distortion metric. QGIS database visualization and a fresh-database script replay remain unverified; neither is claimed as completed.

## Official References

- [PostgreSQL generated columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [GDAL ogr2ogr](https://gdal.org/en/stable/programs/ogr2ogr.html) and [PostgreSQL driver](https://gdal.org/en/stable/drivers/vector/pg.html)
- [PostGIS ST_MakeValid](https://postgis.net/docs/ST_MakeValid.html), [ST_Area](https://postgis.net/docs/ST_Area.html), and [ST_Covers](https://postgis.net/docs/ST_Covers.html)