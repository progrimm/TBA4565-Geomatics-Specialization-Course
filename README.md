# TBA4565-Geomatics-Specialization-Course

Learning projects for the TBA4565 Geomatics Specialization Course.

## Project 1: Comparing Map Projections

An interactive React/TypeScript map explores Mercator and Eckert IV projection distortion through a morph slider and equal-radius geographic circles. A native PostGIS database now holds the country geometries and stored ellipsoidal areas; the frontend still uses local GeoJSON, with API integration next.

- [Project overview and learning agreement](Project%201/README.md)
- [Current checkpoint and learning log](Project%201/PROGRESS.md)
- [Frontend setup and data source](Project%201/frontend/README.md)
- [Database setup, SQL scripts, and verification](Project%201/database/README.md)

## Run the Map

From the repository root, with Node.js supported by Vite (Node 24 used here):

```powershell
npm --prefix "Project 1/frontend" ci
npm --prefix "Project 1/frontend" run dev
```

Open the local URL printed by Vite. The map needs no database or API to run. Production and lint checks:

```powershell
npm --prefix "Project 1/frontend" run build
npm --prefix "Project 1/frontend" run lint
```

## Status

Phases 1-3 are complete: static maps, the interactive distortion study, and manually verified PostGIS import/repair/area/index work. Newly recorded database scripts have not yet been replayed against a fresh database.

Next phases: FastAPI GeoJSON and distortion statistics with frontend integration and pyproj; Docker Compose for API/database; then an optional country comparison panel and deployment polish. No backend or container configuration has been implemented yet.