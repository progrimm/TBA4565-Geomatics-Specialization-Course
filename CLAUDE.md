# TBA4565 module repo: sprint mode (until 2026-10-30)

Learning projects for NTNU TBA4565 (GI Science and Systems). Each project has its own README; Project 2 also has its own CLAUDE.md.

- **Project 1, Projection Lab** (GI Science): Mercator vs Eckert IV area distortion. React + d3, FastAPI, PostGIS, Docker.
- **Project 2, Trondheim 3D** (GI Systems): CesiumJS city model with terrain, OSM buildings, DSB public shelters and nearest-shelter analysis.
- **Project 3, 3DGS Viewer** (3D GIS): split out of Project 2 on 2026-10-27. A static viewer where you open your own 3D Gaussian splat file (PLY, SPZ, .splat, .ksplat, SOG) and inspect it in the browser with Spark/three.js: file facts, up-axis fix, two-point distance. Nothing is uploaded. The earlier CesiumJS globe gallery and viewer lab were dropped on 2026-10-28 because the gallery splats needed Cesium's evaluation token (in git history at 9442d81). (The original Project 3, a Lillehammer flight sim, was scrapped on 2026-10-27. Don't bring any of it back.)

## Final product
One static website on GitHub Pages: a "My GIS module" homepage in `site/` at `/`, Project 1 at `/projection-lab/`, Project 2 at `/trondheim-3d/` and Project 3 at `/3dgs-viewer/`. Every app must build and work under its subpath (Vite `base`) and link back to the homepage. Project 1 runs on Pages in static data mode; Docker Compose stays its full-stack reference. Don't add anything that breaks this, e.g. absolute `/` asset paths or runtime calls to a backend in static mode.

## Sprint override
- IMPORTANT: Deadline 2026-10-30. Implement directly. This overrides the tutoring agreement in `Project 1/README.md` and the "wait for approval / max ~30 lines" rules in `Project 2/CLAUDE.md` for this sprint.
- Still explain the GIS concept and the design choice behind each change in 2–4 sentences, and link the official docs for any new API. I have to write about it in a report.
- Plan first for anything touching more than ~3 files. Skip planning for small fixes.
- Work only inside the project folder named in the task.
- Never delete files, force-push or rewrite git history without asking. Commit after each verified step (Conventional Commits).

## Verify before saying done
- Project 1: `npm --prefix "Project 1/frontend" run build` and `run lint`; backend tests: `uv run --locked --project "Project 1/backend" pytest` (once tests exist).
- Project 2: `npm --prefix "Project 2" run lint`, `run format:check`, `test`, `run build`.
- Project 3: the same four scripts with `--prefix "Project 3"`. Benchmark numbers come only from the Playwright benchmark script run on my machine, never from estimates.
- UI changes: check in a browser (Playwright is fine) at 1600 px and 390 px width and look at the screenshot.
- Show evidence (the command and its result). Don't just assert success.

## Keep docs honest
- After a verified change, update that project's README (and `Project 1/PROGRESS.md` for Project 1): what changed, how it was verified, what was not verified. These docs are the source for my report.
- Never invent numbers. Every result in the docs must come from running code.

## Environment
- Windows, PowerShell, Node 24, Python 3.14 + uv, Docker Desktop.
- Secrets live in each project's `.env` (git-ignored). Never print or commit them.
- Report material goes in `report/` (figures in `report/figures/`, notes in `report/notes/`).
