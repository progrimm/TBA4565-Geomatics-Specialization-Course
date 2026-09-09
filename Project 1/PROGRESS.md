# Project 1 Progress

Project scope and tutoring rules: [README.md](README.md).

## Current Checkpoint

- Last updated: 2026-09-09.
- Phase: 3 complete through learner-run database verification; Phase 4 not started.
- Frontend: React, TypeScript, Vite, d3-geo, and d3-geo-projection. Local Natural Earth 1:110m countries, loading/error state, one morphing SVG map, graticule, world outline, 30 finite geographic circles with a toggle, keyboard-accessible blend slider, and projection explanations.
- Native tools: PostgreSQL 18.6, PostGIS 3.6.2, GDAL 3.13.3 via OSGeo4W; QGIS installed, version not recorded.
- Database: `localhost:5432`, database `projection_lab`, table `public.countries`; 177 MultiPolygon/4326 features, primary key, GiST index, and stored generated `geodesic_area_m2`.
- Frontend verification: production build and ESLint passed after redesign. Browser checks loaded 177 features and verified one SVG, valid paths at blend values 0, 0.5, and 1, 0/30 circles when toggled, keyboard controls, and no horizontal overflow at 1600, 1024, 768, 390, and 320 pixels.
- Database verification: after USA/Sudan repairs, 177 rows with zero null, empty, or invalid geometries; all 177 areas populated, positive, and finite. Greenland approximately 2,206,644.4394 square kilometers. Berlin returned Germany/DEU; its observed plan used the GiST index.
- Integration status: frontend still reads the original static GeoJSON; no API, pyproj calculation, or Docker configuration exists.
- Reproduction status: [database guide and SQL scripts](database/README.md) recorded with explicit agent-edit authorization. Static checks only for these new artifacts; complete fresh-database replay remains unverified. No live database was changed by the agent.
- Blockers: none known.
- Important constraints: finite circles approximate infinitesimal indicatrices; intermediate blends generally preserve neither angles nor area; Mercator latitude is clamped at approximately +/-85.05 degrees. Refitting each blend means screen areas are not on a common scale. D3 uses spherical geometry; PostGIS geography areas use the WGS 84 ellipsoid and generalized boundaries. Database repairs do not modify the static source.
- Next proposed action: resume tutor mode for Phase 4 after explicit confirmation. Start with official FastAPI documentation and one small backend step; establish a least-privilege database role before application database access. Do not use `postgres` as the API role.
- Teaching pace: brief React refreshers only; prioritize GIS implementation, without mandatory observation questions.

## Phase Tracker

- [x] Phase 1: static Mercator and Eckert IV maps using local Natural Earth GeoJSON.
- [x] Phase 2: Tissot's indicatrix overlay and projection morph slider.
- [x] Phase 3: PostGIS setup, Natural Earth import, and geodesic areas (interactive workflow verified; new script replay pending).
- [ ] Phase 4: FastAPI GeoJSON and distortion statistics endpoints; frontend integration.
- [ ] Phase 5: Docker Compose for database and API.
- [ ] Phase 6 (stretch): country area comparison panel and deployment polish.

## Learning Log

### 2026-09-08: Project Notes

- Recorded the project brief, learning goals, phase order, and tutoring preferences.
- Created this checkpoint to support continuity across chats.
- No setup, application implementation, or technical lesson has begun.

### 2026-09-08: Phase 1 and Cleanup

- Built [the frontend](frontend/README.md) through small learner-implemented steps.
- Fixed dependency placement: frontend dependencies now live in its own manifest; the accidental parent-folder npm files are no longer present.
- Added a focused [local declaration](frontend/src/d3-geo-projection.d.ts) for `geoEckert4`; removed the import suppression. The suggested `@types/d3-geo-projection` package returned npm E404 and should not be recommended again.
- With explicit editing permission, removed unused starter images, icons, CSS, and template documentation; kept the active Vite, TypeScript, and ESLint configs.
- Enlarged SVGs to fill responsive columns, added geographic ocean outlines, and simplified the page styling. No Phase 2 functionality was added.
- Build, lint, and responsive browser checks passed. Browser screenshots caught a malformed CSS wrapper that the build accepted; it was corrected and visually rechecked.

### 2026-09-09: Phase 2 and Single-Map Redesign

- Learner implemented equal-radius geographic circle overlays, a shared visibility checkbox, raw projection interpolation, and a controlled slider.
- Diagnosed a blank page caused by retaining the old pole guard before the new latitude clamp. Removing the guard allowed whole-world fitting to complete.
- At the learner's explicit request, replaced the side-by-side view with one large morphing map and added a compact educational introduction, projection notes, and documented approximation limits.
- Removed the unused fixed Mercator rendering path; preserved the existing morph and data loading behavior.

### 2026-09-09: Phase 3 Native PostGIS Workflow

- Learner created `projection_lab`, enabled PostGIS, and verified the database and extension versions. An existing PostGIS extension in the default `postgres` database was left unchanged.
- Installed GDAL/QGIS through OSGeo4W and checked PostgreSQL/GeoJSON driver support. Used cmd.exe caret continuation in OSGeo4W Shell, not PowerShell continuation.
- Resolved `fe_sendauth: no password supplied` through the external libpq password file. Credentials remain outside the repository; the agent did not inspect the file.
- Inspected and imported the repository's 177-feature Natural Earth GeoJSON with selected attributes, `PROMOTE_TO_MULTI`, a named geometry column, and a GiST index.
- Verified that all imported values were MultiPolygon, then tightened the driver's generic geometry column to `geometry(MultiPolygon,4326)` without reprojection; the primary key and spatial index remained present.
- Found two invalid self-intersections: USA and Sudan. A read-only `ST_MakeValid` preview yielded valid, nonempty MultiPolygons. The learner repaired the two rows in a transaction, rechecked 177/0/0/0 total/missing/empty/invalid, and committed.
- Calculated Greenland's geography area as approximately 2,206,644,439,414.82 square meters and added `geodesic_area_m2` using `GENERATED ALWAYS AS (ST_Area(geom::geography)) STORED`. Explicit `STORED` matters with PostgreSQL 18's virtual generated columns. All 177 values were positive and finite.
- Queried `ST_Covers` for longitude 13.405, latitude 52.52; Germany/DEU matched. `EXPLAIN (ANALYZE, BUFFERS)` showed `countries_geom_geom_idx`, one candidate rejected by the exact filter, and one result. The 0.110 ms execution time is a single observed run, not a benchmark.
- Learned that geometry area in EPSG:4326 has square-degree units, whereas geography area defaults to spheroidal square meters. Stored generated values follow geometry updates automatically. Geometry repair is not evidence of authoritative boundary accuracy.

### 2026-09-09: Reproducibility and Documentation

- With explicit agent-edit permission, added the [database guide](database/README.md), extension setup, transactional post-import preparation, and read-only verification SQL. Updated the root, project, and frontend READMEs and this checkpoint.
- Preparation uses source `ADM0_A3` codes `USA`/`SDN`, verified directly from the GeoJSON, instead of generated row IDs. Guard checks reject unexpected invalid features and incompatible repairs. No destructive reset/import options are provided.
- Local database-guide links and basic SQL guard/block-structure checks passed. These checks do not execute or fully parse PostgreSQL/PostGIS SQL; a fresh-database replay is still pending. The scripts do not change the status of the already-verified interactive workflow.
- No live database mutations or frontend behavior changes were made. Phase 4 remains unstarted and requires the learner's go-ahead.

## Updating Future Checkpoints

After each completed step, update the current checkpoint and append a short dated entry containing:

- What was built or changed, with links to relevant workspace files.
- How it was verified: the command and result, or the browser behavior checked.
- What was learned, including any mistake debugged and its cause.
- Any unresolved question or blocker.
- The next agreed action and whether the learner has authorized starting it.

Only mark a phase complete once its behavior has been verified. Keep unfinished work explicit rather than treating code that was merely written as working code.