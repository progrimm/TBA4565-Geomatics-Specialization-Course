# TBA4565-Geomatics-Specialization-Course

Learning projects for the TBA4565 Geomatics Specialization Course.

## Project 1: Comparing Map Projections

An interactive React/TypeScript map explores Mercator and Eckert IV projection distortion through a morph slider and equal-radius geographic circles. FastAPI serves 177 country geometries from native PostGIS. A Greenland comparison panel shows calculated endpoint projection areas alongside the morphing map; intermediate blends are explicitly unmeasured.

- [Project overview and learning agreement](Project%201/README.md)
- [Current checkpoint and learning log](Project%201/PROGRESS.md)
- [Frontend setup and data source](Project%201/frontend/README.md)
- [Backend setup, endpoints, and Greenland calculations](Project%201/backend/README.md)
- [Database setup, SQL scripts, and verification](Project%201/database/README.md)

## Run the Map

First prepare the database and restricted `projection_api` role using the database guide. Keep credentials in the external libpq password file, not the repository. With uv and Python 3.14 or newer, start the API from the repository root:

```powershell
uv sync --locked --project "Project 1/backend"
uv run --locked --project "Project 1/backend" fastapi dev "Project 1/backend/main.py"
```

In a separate terminal, with Node.js supported by Vite (Node 24 used here):

```powershell
npm --prefix "Project 1/frontend" ci
npm --prefix "Project 1/frontend" run dev
```

Open the local URL printed by Vite. PostgreSQL and FastAPI on port 8000 must remain running. Vite forwards `/api/*` to FastAPI, stripping `/api`; the static GeoJSON remains the import source, not a runtime fallback. Production and lint checks:

```powershell
npm --prefix "Project 1/frontend" run build
npm --prefix "Project 1/frontend" run lint
```

## Status

Phases 1-3 are complete: static maps, the interactive distortion study, and manually verified PostGIS import/repair/area/index work. Newly recorded database scripts have not yet been replayed against a fresh database.

Phase 4's local API-to-map workflow and Greenland-only statistics are implemented. Calculation scope is deliberately limited to Greenland as of 2026-09-21; see the progress log for verification and remaining hardening work. Docker Compose, production API routing, broader country statistics, and a general country-selection panel remain unimplemented. The Vite development proxy is not a production deployment configuration.