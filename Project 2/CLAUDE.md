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
5. (Minor) Displaying a 3D Gaussian splat tileset in CesiumJS

## Features (scope)

- Full-page 3D viewer with terrain, starting over central Trondheim
- 3D buildings for Trondheim
- At least one open Trondheim dataset (from Trondheim kommune, Geonorge/
  Kartverket, Entur or OSM), with click-to-inspect attributes
- A "3DGS showcase" view: public georeferenced Gaussian splat tileset
  (Cesium ion asset 4547222, Microsoft Redmond Campus, USA), loaded with
  Cesium3DTileset.fromIonAssetId. Not in Trondheim; camera flies there.
- Simple UI: layer toggles and preset camera views
- Do NOT add features beyond this list without asking.

## Tech stack

- Vite (vanilla JavaScript, ES modules, no framework)
- CesiumJS from npm, version pinned in package.json
- ESLint + Prettier for code quality
- Vitest for unit tests
- GitHub Actions for CI (lint, test, build)
- Deployment: static hosting (e.g. GitHub Pages or Netlify), decided in Module 5
- Windows, PowerShell, Node 24, Git

## Project structure

src/
main.js – entry point, wires everything together only
config.js – constants: camera views, asset IDs, data URLs
viewer.js – Viewer creation and global scene settings
layers/ – one module per data layer (terrain, buildings, splat, ...)
ui/ – toggles, buttons, info panels
utils/ – pure helper functions (e.g. coordinate conversion)
tests/ – Vitest unit tests for utils and data parsing
public/data/ – small static datasets (GeoJSON)

## Code standards

- Small, single-purpose modules and functions. No logic in main.js beyond setup.
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

- Explain your plan BEFORE editing files and wait for my approval.
- Keep changes small (max ~30 lines at a time) so I can review each diff.
- Explain WHY, not just what. Name the Cesium classes/concepts used and link
  to the relevant docs when introducing something new.
- If I ask "why does this happen?", explain the cause. Do not fix it unless
  I ask.
- When behaviour may depend on the CesiumJS version (especially Gaussian
  splats), check the installed version in package.json and say so.
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
- Module 2 (3D buildings): next.
  (Update this section after each module.)
