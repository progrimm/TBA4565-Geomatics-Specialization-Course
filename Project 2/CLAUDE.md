# Trondheim Cesium – Project Guide for Claude

## About this project

A CesiumJS web app about Trondheim, Norway, built by a Geomatics student (NTNU)
as a learning project. The app must be built to PRODUCTION-READY standards:
clean architecture, linted, tested where it matters, robust error handling,
CI, and deployed publicly. Small in scope, high in quality.
Time budget: ~6 hours over 1 week. Prefer doing fewer things properly.

Learning goals:

1. CesiumJS core concepts (Viewer, Camera, Entities vs Primitives, 3D Tiles,
   terrain/imagery, picking, styling)
2. Trondheim open geodata (CRS: EUREF89/UTM32 = EPSG:25832, heights in NN2000
   vs ellipsoidal heights)
3. Professional frontend practices (structure, tooling, testing, CI/CD)
4. Good AI-assisted development habits

## Features (scope)

- Full-page 3D viewer with terrain, starting over central Trondheim
- 3D buildings for Trondheim
- At least one open Trondheim dataset (from Trondheim kommune, Geonorge/
  Kartverket, Entur or OSM), with click-to-inspect attributes
- Simple UI: layer toggles and preset camera views
- "Nearest shelter" analysis: click the ground to get the shelter with the
  shortest walk along the OSM network (Dijkstra in the browser, no routing API),
  its walking and geodesic distance and capacity, with the route drawn; shelter
  totals (count, capacity) in the panel
- Do NOT add features beyond this list without asking.

## Tech stack

- Vite + React 19 (JavaScript/JSX, no TypeScript). Plain React with refs,
  no Resium: Cesium classes are used directly so they stay visible.
- CesiumJS from npm, version pinned in package.json
- ESLint (incl. eslint-plugin-react-hooks) + Prettier for code quality
- Vitest for unit tests
- GitHub Actions for CI (lint, test, build)
- Deployment: static hosting (e.g. GitHub Pages or Netlify), decided in Module 5
- Windows, PowerShell, Node 24, Git

## Project structure

src/
main.jsx – entry point: global setup (ion token) and React root only
App.jsx – composes hooks and components
config.js – constants: camera views, asset IDs, data URLs
viewer.js – Viewer creation and global scene settings
layers/ – plain-JS Cesium loaders, one per data layer (no React)
hooks/ – React hooks bridging React and Cesium (viewer lifecycle, layer state)
components/ – React UI: panel, view buttons, layer toggles, messages
state/ – small framework-independent stores (messages)
utils/ – pure helper functions (e.g. coordinate conversion)
scripts/ – Node data-prep scripts (e.g. fetch-shelters.js)
tests/ – Vitest unit tests for utils, stores and data parsing
public/data/ – static datasets (shelters GeoJSON, walking network JSON)

## Code standards

- Small, single-purpose modules and functions. No logic in main.jsx beyond setup.
- Cesium code lives in layers/ and viewer.js, not in components. Components
  call those modules; Cesium objects are mutated outside React render.
- No magic numbers: coordinates, asset IDs and URLs live in config.js.
- Every async load (tilesets, terrain, data) has error handling. The app must
  keep working and show a user-friendly message if one layer fails.
- Show loading state for slow layers.
- Coordinates: comments always state CRS and height reference.
- JSDoc on exported functions.
- Code must pass `npm run lint` and `npm test` before committing.
- Performance: be mindful of tileset settings (e.g. maximumScreenSpaceError)
  and consider requestRenderMode.
- Accessibility basics: buttons are real <button> elements with labels;
  layout works on mobile.
- Data attribution and licences (e.g. NLOD, CC BY 4.0, ODbL) must be shown
  in the app and README.

## Security

- The Cesium ion token is read from `.env` as `VITE_CESIUM_TOKEN`. Never
  hardcode, print or commit it. `.env` is in `.gitignore`; provide
  `.env.example` with a placeholder.
- Note: Vite embeds VITE\_ variables in the client bundle, so the token is
  public in production. The production token must be a separate token with
  minimal scopes and restricted to the deployed URL in Cesium ion.
- Never run commands that delete files, force-push or rewrite git history
  without asking.

## How to work with me (IMPORTANT)

- SPRINT OVERRIDE (until 2026-10-30): the sprint rules in the root CLAUDE.md take
  precedence over the approval and ~30-line rules below. Implement directly.
- Explain your plan BEFORE editing files and wait for my approval.
- Keep changes small (max ~30 lines at a time) so I can review each diff.
- Explain WHY, not just what. Name the Cesium classes/concepts used and link
  to the relevant docs when introducing something new.
- If I ask "why does this happen?", explain the cause. Do not fix it unless
  I ask.
- When behaviour may depend on the CesiumJS version, check the installed
  version in package.json and say so.
- Point out bad practices or anything that falls short of production quality.
- Commit messages: Conventional Commits, e.g. "feat: add terrain layer",
  "fix: handle failed tileset load", "chore: add eslint".

## Module rules

- Claude writes all code in every module. I direct, review and approve; I do
  not write code myself.
- My learning comes from understanding the code: explain the Cesium concepts
  and design choices behind each change.

## Current status

- Module 0: setup done (Vite + Cesium 1.146.0, ESLint, Prettier, Vitest,
  CI workflow at repo root `.github/workflows/project2-ci.yml`).
- Module 1: done (camera start view, terrain with error handling, notify UI).
- Module 2: done (Cesium OSM Buildings, ion 96188).
- Module 3: done (DSB public shelters, EPSG:25832 → WGS84 via scripts/fetch-shelters.js, InfoBox).
- Module 4: UI done (dark glass panel, layer toggles, camera presets, mobile
  bottom sheet).
- 2026-10-27: camera presets are target-based (landmark + heading/pitch/range,
  utils/camera.js). Targets come from OSM/Nominatim, ground heights from
  Kartverket DTM + 40 m. Screenshot-checked at 1600 and 390 px.
- React refactor: done (hooks/, components/, state/; plain React, no Resium).
- 2026-10-27: the 3DGS showcase was split out into Project 3 (`../Project 3/`).
  It is out of scope here.
- 2026-10-27: nearest-shelter analysis done (utils/nearest.js with GeographicLib
  reference fixture, layers/nearest.js, hooks/useNearestShelter.js,
  components/NearestShelter.jsx). Browser-checked at 1600 and 390 px.
- 2026-10-27: walking routes. scripts/fetch-network.js (Overpass) →
  public/data/walking-network.json (compact, utils/osmNetwork.js); graph,
  snapping and Dijkstra in utils/network.js; hooks/useWalkingNetwork.js. Falls
  back to straight lines if the network fails. GraphHopper was rejected (public
  API key, daily quota).
- 2026-10-28: hardening. Shelter provenance (metadata member, fetch date in
  credit), WFS attribute validation, Playwright checks in scripts/
  (check-failed-layers, check-accessibility, benchmark-buildings), SSE 16 kept,
  panel surface 85 % for contrast.
- Next: deployment (root sprint session 9).
  (Update this section after each module.)
