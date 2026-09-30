# TBA4565-Geomatics-Specialization-Course

Learning projects for the TBA4565 Geomatics Specialization Course.

## Project 1: Comparing Map Projections

An interactive React/TypeScript map explores Mercator and Eckert IV projection distortion through a morph slider and equal-radius geographic circles. FastAPI serves 177 country geometries from PostGIS. A Greenland comparison panel shows calculated endpoint projection areas alongside the morphing map; intermediate blends are explicitly unmeasured.

- [Project overview and learning agreement](Project%201/README.md)
- [Current checkpoint and learning log](Project%201/PROGRESS.md)
- [Frontend setup and data source](Project%201/frontend/README.md)
- [Backend setup, endpoints, and Greenland calculations](Project%201/backend/README.md)
- [Database setup, SQL scripts, and verification](Project%201/database/README.md)

## Run the Map

### Docker Compose

Docker Desktop is required. From the repository root, create the local environment file from the example and replace both placeholders with private development passwords. Keep `Project 1/.env` private; it is ignored by Git.

```powershell
Copy-Item "Project 1/.env.example" "Project 1/.env"
```

For a new container database, initialize its country table and restricted API role once:

```powershell
docker compose --env-file "Project 1/.env" -f "Project 1/compose.yaml" up -d db
docker compose --env-file "Project 1/.env" -f "Project 1/compose.yaml" --profile setup run --build --rm bootstrap
```

The bootstrap imports the versioned GeoJSON, applies the existing geometry preparation SQL, and creates the read-only `projection_api` role. It refuses to import if `public.countries` already exists. It is an explicit one-shot command, not part of ordinary application startup.

Build and start the app:

```powershell
docker compose --env-file "Project 1/.env" -f "Project 1/compose.yaml" up -d --build web
```

Open <http://127.0.0.1:8080>. Nginx serves the production Vite build and proxies `/api/*` to FastAPI; FastAPI connects to PostGIS over Compose's private network. PostgreSQL is published only to the local machine on port `5433`, and the API on `8000`. The named database volume survives `docker compose down`; `down -v` deletes it and its contents.

Check service state and API responses:

```powershell
docker compose --env-file "Project 1/.env" -f "Project 1/compose.yaml" ps
Invoke-RestMethod http://127.0.0.1:8080/api/countries/count
```

### Native Development

Alternatively, prepare the native database and restricted `projection_api` role using the database guide. Keep credentials in the external libpq password file, not the repository. With uv and Python 3.14 or newer, start the API from the repository root:

```powershell
uv sync --locked --project "Project 1/backend"
uv run --locked --project "Project 1/backend" fastapi dev "Project 1/backend/main.py"
```

In a separate terminal, with Node.js supported by Vite (Node 24 used here):

```powershell
npm --prefix "Project 1/frontend" ci
npm --prefix "Project 1/frontend" run dev
```

Open the local URL printed by Vite. Native PostgreSQL and FastAPI on port 8000 must remain running. Vite forwards `/api/*` to FastAPI, stripping `/api`; the static GeoJSON remains the import source, not a runtime fallback. Production and lint checks:

```powershell
npm --prefix "Project 1/frontend" run build
npm --prefix "Project 1/frontend" run lint
```

## Status

Phases 1-3 are complete: static maps, the interactive distortion study, and manually verified PostGIS import/repair/area/index work. The database scripts and Compose bootstrap were verified against the container database; a full fresh-database replay remains an optional additional check.

Phase 4's local API-to-map workflow and Greenland-only statistics are implemented. Phase 5 is implemented and verified locally: Compose runs PostGIS, FastAPI, and an Nginx-served production frontend, with an explicit bootstrap service for importing and preparing the country data. Calculation scope remains deliberately limited to Greenland; see the progress log for verification and remaining hardening work. Broader country statistics and a general country-selection panel remain unimplemented.
