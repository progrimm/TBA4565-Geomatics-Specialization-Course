# TBA4565-Geomatics-Specialization-Course

Learning projects for the TBA4565 Geomatics Specialization Course: three web GIS applications, one GI Science-oriented (Project 1), one GI Systems-oriented (Project 2) and one 3D GIS-oriented (Project 3).

## Project 1: Comparing Map Projections

An interactive React/TypeScript map explores Mercator and Eckert IV projection distortion through a morph slider and equal-radius geographic circles. FastAPI serves 177 country geometries from PostGIS, together with projection-area statistics precomputed for every country. Click any country, or pick it from the list, to compare its spherical, ellipsoidal, Mercator and Eckert IV areas. A distortion-vs-latitude chart compares every country's Mercator inflation with the theoretical sec²φ. Intermediate blends are explicitly unmeasured. CI runs frontend lint and build plus the backend pytest suite.

- [Project overview and learning agreement](Project%201/README.md)
- [Current checkpoint and learning log](Project%201/PROGRESS.md)
- [Frontend setup and data source](Project%201/frontend/README.md)
- [Backend setup, endpoints, and the country area method](Project%201/backend/README.md)
- [Results: per-country CSV and summary](Project%201/results/summary.md)
- [Database setup, SQL scripts, and verification](Project%201/database/README.md)

## Project 2: Trondheim 3D

A CesiumJS + React web app for exploring Trondheim in 3D. It shows terrain, OpenStreetMap buildings and DSB public shelters that you can click to inspect. CI runs lint, format check, tests and build.

- [Setup, scripts, data, and attributions](Project%202/README.md)

```powershell
Copy-Item "Project 2/.env.example" "Project 2/.env"   # then add your Cesium ion token
npm --prefix "Project 2" ci
npm --prefix "Project 2" run dev
```

## Project 3: 3DGS Viewer

A CesiumJS + React web app for georeferenced 3D Gaussian splats, split out of Project 2 on 2026-10-27. It opens directly on a public Gaussian splat of the Microsoft campus in Redmond (USA). A globe gallery of several splats and a "Viewer lab" comparing 3DGS web viewers are planned. CI runs lint, format check, tests and build.

- [Setup, scripts, token exception, and attributions](Project%203/README.md)

```powershell
Copy-Item "Project 3/.env.example" "Project 3/.env"   # then add your Cesium ion token
npm --prefix "Project 3" ci
npm --prefix "Project 3" run dev
```

The rest of this README covers Project 1.

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

The bootstrap imports the versioned GeoJSON, applies the existing geometry preparation SQL, creates the read-only `projection_api` role and creates the empty `country_area_stats` table. It refuses to import if `public.countries` already exists. It is an explicit one-shot command, not part of ordinary application startup.

Then precompute the projection-area statistics once. This runs the backend image as the database administrator:

```powershell
docker compose --env-file "Project 1/.env" -f "Project 1/compose.yaml" --profile setup run --build --rm areas
```

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

All six build phases of Project 1 are done and verified locally:

- static maps;
- the distortion study with circles and the morph slider;
- the PostGIS import, repair, areas and index;
- the restricted API and projection statistics for **all 177 countries**;
- Docker Compose;
- the country panel and distortion-vs-latitude chart.

On 2026-10-27 the Compose setup (bootstrap, area precompute, app) was replayed on a fresh, empty volume. The API it served matched `results/country_areas.csv` to within 1.1e-13 relative. Headline results and the method are in the [Project 1 README](Project%201/README.md). The remaining limitations are listed there too. The main open item is deployment: the GitHub Pages static data mode at `/projection-lab/` is not built yet.
