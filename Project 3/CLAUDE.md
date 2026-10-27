# 3DGS Viewer – Project Guide for Claude

## About this project

A CesiumJS web app for displaying georeferenced 3D Gaussian splats (3DGS),
built by a Geomatics student (NTNU) for TBA4565 (3D GIS part). It was split out
of Project 2 (Trondheim 3D) on 2026-10-27. It must be built to the same
PRODUCTION-READY standards as Project 2: clean architecture, linted, tested
where it matters, robust error handling, CI, and deployed publicly (GitHub
Pages under `/3dgs-viewer/`, see the root CLAUDE.md).

Research question: "How well do current web technologies display georeferenced
3D Gaussian splats, and what do geospatial viewers (CesiumJS) offer over
general-purpose splat viewers?"

Learning goals:

1. 3D Tiles with Gaussian splat content (KHR_gaussian_splatting) in CesiumJS
2. Georeferencing: tileset root transforms, ECEF (EPSG:4978) vs WGS84
   geographic (EPSG:4979), ellipsoidal heights
3. Comparing 3DGS web viewers fairly (reproducible benchmarks)
4. Professional frontend practices (structure, tooling, testing, CI/CD)

## Features (scope)

- Full-page 3D viewer that opens directly on the Gaussian splat (Cesium ion
  asset 4547222, Microsoft Redmond Campus, USA), framed by the tileset's own
  bounding sphere
- A panel button that flies back to the splat
- Planned (see `report/SPRINT.md` sessions 6–8): a globe gallery of several
  georeferenced splats (inspect, measure, alignment check, splat vs mesh,
  performance panel) and a "Viewer lab" benchmarking Spark, PlayCanvas,
  Babylon.js and CesiumJS on the same splat, one page per viewer.
- Do NOT add features beyond this list without asking.

## Tech stack

- Same as Project 2: Vite + React 19 (JavaScript/JSX, no TypeScript), plain
  React with refs (no Resium), CesiumJS from npm pinned in package.json
  (1.146.0), ESLint + Prettier, Vitest, GitHub Actions
  (`.github/workflows/project3-ci.yml`).
- Windows, PowerShell, Node 24, Git
- Helpers (messages store, camera utils, HTML escaping, motion) are copied
  from Project 2, not shared, so each project builds on its own.

## Project structure

src/
main.jsx – entry point: global setup (ion token) and React root only
App.jsx – composes hooks and components
config.js – constants: asset IDs, tileset settings
viewer.js – Viewer creation, global scene settings, ion tokens
layers/ – plain-JS Cesium loaders, one per data layer (no React)
hooks/ – React hooks bridging React and Cesium (viewer lifecycle, layer state)
components/ – React UI: panel, splat button, messages
state/ – small framework-independent stores (messages)
utils/ – pure helper functions (camera options, HTML escaping, motion)
tests/ – Vitest unit tests

## Code standards

- Small, single-purpose modules and functions. No logic in main.jsx beyond setup.
- Cesium code lives in layers/ and viewer.js, not in components. Components
  call those modules; Cesium objects are mutated outside React render.
- No magic numbers: coordinates, asset IDs and URLs live in config.js.
- Every async load has error handling. The app must keep working and show a
  user-friendly message if one layer fails. Show loading state for slow layers.
- Coordinates: comments always state CRS and height reference.
- JSDoc on exported functions.
- Code must pass `npm run lint`, `npm run format:check`, `npm test` and
  `npm run build` before committing.
- Performance: be mindful of tileset settings (maximumScreenSpaceError);
  requestRenderMode is on. Benchmark numbers come only from the Playwright
  benchmark script run on the user's machine, never from estimates.
- Accessibility basics: buttons are real <button> elements with labels;
  layout works on mobile.
- Data attribution and licences must be shown in the app and README.

## Security

- The Cesium ion token is read from `.env` as `VITE_CESIUM_TOKEN`. Never
  hardcode, print or commit it. `.env` is git-ignored; `.env.example` has a
  placeholder.
- Vite embeds VITE\_ variables in the client bundle, so the token is public in
  production. The production token must be a separate token with minimal
  scopes, restricted to the deployed URL in Cesium ion.
- Exception (deliberate): the splat asset 4547222 is not in the Asset Depot,
  so only that asset is requested with Cesium's built-in evaluation token
  (`CESIUM_EVALUATION_TOKEN` in viewer.js). Everything else uses our token.
- Never run commands that delete files, force-push or rewrite git history
  without asking.

## How to work with me (IMPORTANT)

- SPRINT OVERRIDE (until 2026-10-30): the sprint rules in the root CLAUDE.md
  apply. Implement directly; plan first for changes touching more than ~3 files.
- Explain WHY, not just what. Name the Cesium classes/concepts used and link
  to the relevant docs when introducing something new.
- If I ask "why does this happen?", explain the cause. Do not fix it unless
  I ask.
- Gaussian splat support in CesiumJS is new and changes between versions:
  check the installed version in package.json and say so.
- Point out bad practices or anything that falls short of production quality.
- Commit messages: Conventional Commits.

## Module rules

- Claude writes all code. I direct, review and approve; I do not write code.
- My learning comes from understanding the code: explain the concepts and
  design choices behind each change.

## Current status

- 2026-10-27: split from Project 2, features pending. The app opens on the
  Redmond splat (ion 4547222) with Cesium World Terrain; the panel has one
  button that flies back to it.
- Next: session 6, georeferenced splat gallery (see `report/SPRINT.md`).
  (Update this section after each step.)
