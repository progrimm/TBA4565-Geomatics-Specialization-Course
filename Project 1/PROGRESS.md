# Project 1 Progress

Project scope and tutoring rules: [README.md](README.md).

## Current Checkpoint

- **Last updated:** 2026-10-27, in the sprint (the agent implements directly, per the root CLAUDE.md override).
- **Status:** all six build phases are done and verified locally. Projection statistics cover all 177 countries. The one open deployment item is GitHub Pages static data mode; see [Limitations](README.md#limitations).
- **Frontend:**
  - React/TypeScript/Vite and D3 draw one morphing SVG map with graticule, world outline, 30 finite circles and a keyboard slider.
  - Any country can be selected by click, tap, the country list, or the arrow keys on the chart, which opens its area panel.
  - The distortion-vs-latitude chart (d3-scale, log y-axis, sec²φ curve) and a plain-language Method section.
- **Backend:** Python 3.14.7, FastAPI 0.141.1, Psycopg 3.3.6, pyproj, Shapely and pytest (dev).
  - GET endpoints: `/health`, `/countries/count`, `/countries`, `/countries/areas`, `/countries/{adm0_a3}/areas`.
  - [country_areas.py](backend/country_areas.py) `compute` fills `public.country_area_stats`; `export` writes [results/](results/).
- **Database:** native `localhost:5432` and Compose `127.0.0.1:5433` both hold `public.countries` (177 valid MultiPolygons, GiST index, stored WGS 84 areas) and `public.country_area_stats` (177 rows).
- **Results:** [results/summary.md](results/summary.md) and [results/country_areas.csv](results/country_areas.csv). Excluding the clipped Antarctica:
  - the median Mercator ratio is 1.2063 and the maximum 16.5433 (Greenland);
  - Eckert IV stays within 2.5e-6 of 1;
  - sec²(φc) predicts within 1% for 156 of 176 countries and always underestimates (Jensen).
- **Verification:**
  - pytest: 12 passed;
  - frontend lint and build pass;
  - CI workflow linted with actionlint;
  - Playwright: 39 interaction checks and 31 accessibility checks at 1600/390/320 px, with screenshots inspected;
  - a fresh-volume Compose replay matched the CSV to within 1.1e-13.
- **Remaining:** static Pages mode; CI not yet observed on GitHub; browser tests not committed; native-setup replay; generic HTTP 500s for other database failures. See [Limitations](README.md#limitations).
- **Next action:** wire static data mode for GitHub Pages at `/projection-lab/`, then write the report from `results/summary.md` and the chart.

## Phase Tracker

- [x] Phase 1: static Mercator and Eckert IV maps using local Natural Earth GeoJSON.
- [x] Phase 2: Tissot's indicatrix overlay and projection morph slider.
- [x] Phase 3: PostGIS setup, Natural Earth import, and geodesic areas. The interactive workflow was verified, and the scripts were replayed on a fresh Compose volume on 2026-10-27.
- [x] Phase 4: FastAPI GeoJSON, projection-area statistics (Greenland first, then all 177 countries on 2026-10-27), and frontend integration.
- [x] Phase 5: Docker Compose for database, API and frontend, including bootstrap and the `areas` precompute. Replayed on a fresh volume on 2026-10-27.
- [x] Phase 6: country area panel for all countries, the distortion-vs-latitude chart, accessibility pass and CI (2026-10-27). Open: GitHub Pages static mode.

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

### 2026-09-21: FastAPI, uv, and Restricted Database Access

- Learner created [main.py](backend/main.py) with `/health`, used uv for a virtual environment, verified the interpreter/import, and browser-tested the endpoint. With authorization, the agent recorded dependencies in [pyproject.toml](backend/pyproject.toml) and [uv.lock](backend/uv.lock); `uv sync --locked --dry-run` reported no changes at that stage. Psycopg, pyproj, and Shapely were subsequently added by the learner with uv.
- Created and checked `projection_api` interactively; set a password with psql `\password`, added the role-specific external password-file entry, and granted database/schema/table access. Separate SQL Shell and Python queries verified the restricted identity and 177 rows. Only the learner performed database mutations.
- Added and browser-verified `/countries/count`. Learned that synchronous Psycopg belongs in a normal `def` route, dispatched by FastAPI to a thread pool, and that connection context managers close connections even on return.

### 2026-09-21: GeoJSON and Frontend Integration

- Learner verified Germany's geometry export, then its Feature properties (`admin`, `adm0_a3`, `geodesic_area_m2`), all-country winding, and a FeatureCollection summary of `FeatureCollection | 177 | object | Feature`. Winding differs between D3 spherical polygons and RFC 7946; export preserves the already-verified D3 orientation without mutating data.
- SQL casts `ST_AsGeoJSON` text to JSON before ordered aggregation to avoid quoted Feature strings, and supplies an empty-array fallback. The fallback was not separately tested with an empty table.
- Implemented `/countries`; corrected a Python multiline SQL string by using triple quotes. Psycopg returns Python objects for PostgreSQL JSON, which FastAPI serializes directly.
- Changed [App.tsx](frontend/src/App.tsx) to `/api/countries` and configured [vite.config.ts](frontend/vite.config.ts) to proxy to the backend. Learner confirmed HTTP 200/177 features, both endpoints/midpoint including repaired USA/Sudan geometries, circle toggling, API outage/error/recovery, and successful build/lint. This development routing is not production configuration.

### 2026-09-21: Greenland Projection Calculations

- Learner implemented [greenland_areas.py](backend/greenland_areas.py) using pyproj and Shapely. Coordinates are interpreted on a common sphere for Mercator/Eckert IV comparisons; stored WGS 84 ellipsoidal area is reported separately. Great-circle densification includes holes and all polygon parts. In-memory orientation ensures positive signed reference area; the database remains unchanged.
- Standalone output verified 20/10/5 km refinements. At 5 km the Mercator relative change was `6.4509686e-6`; Eckert IV's was `5.8729288e-7`. Both meet the `1e-5` tolerance, and Eckert IV is within that tolerance of unit area ratio. Corrected the per-projection dictionary lookup so the second projection's first iteration does not access a missing previous value.
- Refactored top-level computation into `calculate_greenland_areas()` with a main guard and explicit numerical exceptions, then exposed `/countries/GRL/areas`. Learner reported success; agent read the live endpoint and confirmed the values in the checkpoint. No generalized country endpoint was added; the learner explicitly retained Greenland-only scope.

### 2026-09-21: Greenland Panel, Verification, and Documentation

- With direct edit authorization, added independent Greenland statistics loading/error handling, finite-positive payload checks, a highlighted Greenland SVG layer, spherical/ellipsoidal references, and both endpoint areas/ratios. Slider endpoints select the matching row; intermediate blends explicitly have no calculated ratio. No interpolated statistics or additional backend calculations were introduced.
- Agent ran `npm --prefix "Project 1/frontend" run build` and `npm --prefix "Project 1/frontend" run lint`: both passed; editor diagnostics were clear. Ad hoc Playwright checks against the live API passed all viewports/blends listed above, circle toggles, HTTP 503 isolation, and malformed statistics handling. Temporary desktop/mobile screenshots were visually inspected; these checks are not a committed test suite. The first test attempt hit a PowerShell Unicode-selector encoding issue, corrected in the test command, not the app.
- Updated root/project/frontend/backend/database READMEs and this progress log, including fresh-setup versus read-only role checks, external secrets, endpoint behavior, Earth models, numerical results, and unverified work. Checked local documentation links. No fresh-database replay, containerization, or live database mutations were performed by the agent.

### 2026-09-21: Projection Lab Simplification

- At the learner's request, rebranded the frontend as Projection Lab, removed the introductory and three explanatory sections, shortened repeated labels, and moved measurement context into a collapsed Method disclosure. Preserved the map, blend slider, keyboard controls, 30 circles, Greenland highlight, all area values, and independent loading/error states. Endpoint ratios are still not interpolated.
- Consolidated HTTP JSON fetching and Greenland-value validation, made endpoint labels data-driven, formatted JSX/CSS, removed unused styles, centralized palette colors, and updated page metadata. Backend/database code and calculations were unchanged.
- Build and lint passed; editor diagnostics clear. Ad hoc Playwright checks against the live API passed at widths 1600/1024/768/390/320, verifying distinct valid morph paths at 0/0.5/1, correct endpoint markers, no overflow, keyboard Home/ArrowRight/End, 0/30 circles, Method keyboard interaction, delayed statistics, independent HTTP 503 failures, invalid statistics, and recovery. Desktop/mobile screenshots were inspected. No browser exceptions. This remains a local Greenland-only milestone, not a new phase.

### 2026-10-27: All-Country Calculation Module and Tests (sprint step 1)

- Sprint mode, as set out in the root CLAUDE.md: the agent implements directly. The goal is to answer, for all 177 countries, how much Mercator inflates area, how that depends on latitude, and how well sec²(φ) predicts it compared with Eckert IV.
- Renamed `backend/greenland_areas.py` to [country_areas.py](backend/country_areas.py) (`git mv`) and generalised it into these parts:
  - the pure `calculate_country_areas()`;
  - latitude-only clipping at ±85.0511°, with the clip edge densified along the parallel;
  - an area-weighted centroid latitude via `+proj=cea`;
  - sec²(φc);
  - a per-country `status` that records failures instead of raising.
- The old Greenland output was saved before the rename. A new run against the native database matched all 15 original fields **bit for bit**.
- A dry run over all 177 countries took about 1.8 s. It printed `Computed 177 countries; 1 not ok`, `SDN Sudan: merc_invalid_geometry,eck4_invalid_geometry` and `ATA clipped to +/-85.0511 deg, kept fraction 0.922678`. Every country converged (10→5 km change < 1e-5).
- Sudan's flag was diagnosed as a narrow spike in the ring. It is valid with straight lon/lat edges but crosses itself once the edges are treated as great circles. Repairing it with `make_valid` changes the projected area by about 5e-7 relative, so its ratios are kept and the flag stays visible ([backend guide](backend/README.md#country-method)).
- Mistake found and fixed: clipping with a rectangle edge on ±180° replaced densified antimeridian edges with straight lines. The polar-cap test then failed with an Eckert IV ratio of 0.9771. The fix clips in latitude only, using x = ±360.
- Added pytest as a uv dev dependency, plus `tests/test_country_areas.py` (12 tests). `uv run --locked --project "Project 1/backend" pytest` reports `12 passed`.
- `/countries/GRL/areas` temporarily computes live through the new module. Checked with FastAPI's TestClient: HTTP 200, Mercator 16.543261873210085, Eckert IV 0.9999997520352772. The precomputed table follows in step 2.

### 2026-10-27: Precomputed Statistics Table (sprint step 2)

- Added [04_create_country_area_stats.sql](database/04_create_country_area_stats.sql), which creates `public.country_area_stats` and grants SELECT to `projection_api`.
- The agent ran it on the native database (5432) and on the Compose database (5433, through `docker compose exec`). It returned `CREATE TABLE` / `GRANT` both times. The API role has SELECT `t` and INSERT `f`.
- `country_areas.py compute`, run as `postgres`, wrote 177 rows to each database. Passwords came from pgpass and `.env` and were never printed.
- Compose: `bootstrap/import.sh` now runs `04`, and the new `setup`-profile service `areas` runs `compute` in the backend image. `docker compose --profile setup run --build --rm areas` reported `Wrote 177 rows`.
- Verification query on both databases: 177 rows, 176 `ok`, SDN flagged (see step 1), ATA clipped. Greenland's Mercator ratio was 16.543261873210085 natively and 16.543261873210074 from the Linux container.
- Not verified: a fresh-volume bootstrap replay.

### 2026-10-27: Country Area Endpoints (sprint step 3)

- [main.py](backend/main.py) now serves `GET /countries/areas` (all 177 countries) and `GET /countries/{adm0_a3}/areas` (one country, case-insensitive), both read from the precomputed table. Nothing is calculated per request. An unknown code returns 404, and a missing or empty table returns 503.
- The response is a superset of the old Greenland response, so `/countries/GRL/areas` keeps working through the generic route.
- **Native, via TestClient:** 177 records. GRL matched all 15 original fields exactly. `grl` returned 200, `XXX` 404, and a simulated missing table 503.
- **Compose, after `up -d --build --wait api`:** 177 records directly and 177 through Nginx. The GRL values were identical to the Compose response before the change. pytest: 12 passed.

### 2026-10-27: Results Export (sprint step 4)

- `country_areas.py export` read the native table and wrote [results/country_areas.csv](results/country_areas.csv) (177 rows plus a header), [frontend/public/data/country_areas.json](frontend/public/data/country_areas.json) (177 records in the API shape, for a later static mode, not used yet) and [results/summary.md](results/summary.md).
- Results, excluding the clipped ATA (n = 176):
  - The median Mercator ratio is 1.2063. The maximum is 16.5433 (Greenland), the minimum 1.0007 (Gabon).
  - Norway (9.3798) is second, because Svalbard reaches 80.7°N.
  - Eckert IV's largest |ratio − 1| is 2.486e-6 (Luxembourg).
  - Measured ratio / sec²(φc): median 1.0010, minimum 1.000010, maximum 1.5964 (Norway). sec²(φc) predicts within 1% for 156 countries and within 10% for 169.
  - ATA's clipped ratio is 25.5238, with 92.27% of its area kept.
- An independent SQL aggregate over the table reproduced every one of those headline numbers.
- The minimum ratio/sec² of 1.000010 being ≥ 1 is consistent with Jensen's inequality, as derived in the summary.
- The summary prose was adjusted so that its claims are computed: the minimum latitude span among the five largest gaps (22.6°) comes from the data, not a fixed sentence.

### 2026-10-27: Country Selection and Distortion Chart (sprint step 5)

- **App.tsx:**
  - One `<path>` per country; a click or tap selects it, with Greenland as the default.
  - The country panel is generalised from the Greenland panel. It has a keyboard-accessible `<select>`, notes for clipping and for check flags, a sec²(φ)-at-centroid row, and the ratio divided by that prediction.
  - Statistics come from a single `/api/countries/areas` request.
  - The slider, the circles, keyboard support and independent loading/error states are kept.
- New [DistortionChart.tsx](frontend/src/DistortionChart.tsx) (a scatter using d3-scale with a log y-axis and the sec²φ curve, hover tooltip, click to select) and [countryAreas.ts](frontend/src/countryAreas.ts).
- d3-scale had not been installed (only d3-geo, d3-geo-projection and d3-array were). `d3-scale@4` and `@types/d3-scale@4` were added; no chart library.
- **Verification:**
  - build and lint passed;
  - an ad hoc Playwright run at 1600 px (mouse) and 390 px (touch) passed 39/39 checks, listed in the [frontend guide](frontend/README.md#verification-recorded);
  - screenshots were inspected. They showed the tooltip covering its own point, which was fixed and rechecked.
- `npm audit` shows 4 high findings, all in dev tooling. They predate this change, and `--omit=dev` reports 0.

### 2026-10-27: Continuous Integration (completion step 1)

- Added [project1-ci.yml](../.github/workflows/project1-ci.yml), modelled on Project 2's workflow and path-filtered to `Project 1/**` plus the workflow file. It runs on pushes to `main` and on pull requests, as two jobs:
  - `frontend`: Node 24 with the npm cache; `npm ci`, `npm run lint`, `npm run build` in `Project 1/frontend`.
  - `backend`: [astral-sh/setup-uv](https://github.com/astral-sh/setup-uv) with Python 3.14 and the uv cache; `uv sync --locked`, `uv run --locked pytest` in `Project 1/backend`. The tests are pure calculations, so CI needs no database.
- **Local verification:**
  - `uvx --from actionlint-py actionlint .github/workflows/project1-ci.yml` passed with no findings.
  - The same commands ran locally in the same working directories: `npm ci` then lint (exit 0) and build passed; `uv sync --locked` reported nothing to change; pytest reported `12 passed`.
- The first local `npm ci` failed with EPERM on the rolldown binary. A Vite dev server the agent had started earlier was still running and locking the file. The agent stopped that process and the rerun succeeded.
- Not verified: an actual GitHub Actions run, because the branch was not pushed.

### 2026-10-27: Fresh-Volume Replay (completion step 2)

- Added [compose.replay.yaml](compose.replay.yaml), an overlay that only moves the published ports (5434/8001/8081). Run with `-p projection-replay`, it gives a new, empty volume beside the running stack. The existing `project1_projection_db_data` volume was not touched.
- **Ran in order:** `up -d --wait db`, `--profile setup run --build --rm bootstrap`, `--profile setup run --build --rm areas`, `up -d --build --wait web`. The exact commands are in the [database guide](database/README.md#fresh-volume-replay).
  - Bootstrap: PostGIS 3.6.4, USA/SDN repaired (`UPDATE 2`), role and grants created, `country_area_stats` created.
  - `areas`: `Computed 177 countries; 1 not ok` (SDN flag) and `Wrote 177 rows`.
  - All three services healthy; `/countries/count` returned 177.
- **API against `results/country_areas.csv`:**
  - The same 177 codes and identical names, statuses and clip flags.
  - Numeric fields within a maximum relative difference of 1.1e-13. The CSV comes from native Windows; the replay runs Linux PROJ/GEOS and a newer PostGIS.
  - The replay's full JSON is identical to the existing Compose stack's.
- The replay was then stopped with `down`. Its volume was kept, and can be removed with `down -v`.
- This also executed the `00`/`01`/`03`/`04` SQL scripts on a fresh database for the first time. The native OSGeo4W setup path has still not been replayed end to end.

### 2026-10-27: Method Explanation (completion step 3)

- Rewrote the collapsed **Method** section in [App.tsx](frontend/src/App.tsx) as six short definition items for non-experts:
  - Mercator is conformal; area grows by sec²φ, 4× at 60° and about 33× at 80°.
  - Eckert IV is equal-area.
  - The circles are a finite-circle version of Tissot's indicatrix.
  - Why chart dots sit above the sec²φ curve.
  - Sphere, not ellipsoid.
  - What is not measured: blends, the Mercator cap and Antarctica's clipping, simplified borders.
- The "under 1% for every country" claim was measured from `results/country_areas.csv`: the ellipsoidal/spherical area ratio − 1 ranges from −0.45% (GAB) to +0.81% (ATA). The sec² examples are exact arithmetic: sec²60° = 4 and sec²80° ≈ 33.2.
- **Verification:**
  - lint and build passed;
  - Playwright opened the disclosure with the keyboard (Enter on the focused summary) at 1600 and 390 px, with all six terms present and no horizontal overflow;
  - footer screenshots at both widths were inspected and are readable in two columns and in one column respectively.

### 2026-10-27: Accessibility and Robustness (completion step 4)

- **Changes:**
  - The chart is a keyboard tab stop: arrows step through countries by latitude, and Home/End jump to the ends. A hidden `aria-live` line announces the selection.
  - `:focus-visible` outline on the chart.
  - The selected map country's border is now 2 px, and chart-point fill opacity went from 0.65 to 0.8: the fill alone was 2.84:1 and is now 3.79:1.
  - Fewer latitude ticks below 600 px.
  - A clearer network-error message.
  - The map caption reads "click a country or use the list". Details are in the [frontend guide](frontend/README.md#accessibility).
- **Verification:**
  - lint and build passed;
  - Playwright passed 31/31 accessibility checks at 1600/390/320 px, including a minimum text contrast of 5.30:1 measured from computed colours, no overflow at 320 px, and a visible focus outline on all six tab stops;
  - the earlier interaction suite passed 39/39 again;
  - screenshots were inspected.
- The first 320 px screenshot showed the x-axis labels colliding (the tick-count fix above).
- A test bug: the tab loop counted focus leaving the page (`BODY`) as a stop without an outline. The test was fixed; the app was not changed for it.
- Not done: no screen-reader software (NVDA, VoiceOver) was used. The map itself is not keyboard-navigable; the select is the keyboard route.

### 2026-10-27: Documentation Cleanup (completion step 5)

- Removed outdated "Greenland-only" and "limited to Greenland" wording from the root README and every Project 1 README: project, backend, database and frontend. The dated learning-log entries above are history and were kept as written.
- **Root README:** a new Project 1 summary, the missing `areas` precompute step in "Run the Map", a link to the results, and a rewritten Status.
- **Project 1 README:** updated status and build order, plus a new [Limitations](README.md#limitations) section listing what is still open or approximate.
- **This file:** rewrote the checkpoint. Phase 5 was still unticked even though Compose was done; it is now ticked.
- **Check:** `grep -i "greenland-only|limited to Greenland"` over the READMEs returns nothing.

## Updating Future Checkpoints

After each completed step, update the current checkpoint and append a short dated entry containing:

- What was built or changed, with links to relevant workspace files.
- How it was verified: the command and result, or the browser behavior checked.
- What was learned, including any mistake debugged and its cause.
- Any unresolved question or blocker.
- The next agreed action and whether the learner has authorized starting it.

Only mark a phase complete once its behavior has been verified. Keep unfinished work explicit rather than treating code that was merely written as working code.