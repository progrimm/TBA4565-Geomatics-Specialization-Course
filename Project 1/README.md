# Project 1: Comparing Map Projections

## Purpose

Build a small GIS web app comparing Mercator and Eckert IV projections through one interactive morphing map, using country shapes and areas to explore cartographic distortion, including the Greenland/Africa comparison. The original side-by-side proof of concept was replaced by this single-map educational layout at the learner's request on 2026-09-09.

The learning process matters as much as the finished app: rebuild hands-on coding fluency, practice debugging, and develop a habit of reading official documentation.

## Current State

Phases 1-3 are complete. Phase 4's local integration was done on 2026-09-21. On 2026-10-27, during the sprint, the statistics were extended from Greenland to **all 177 countries**. The question for the report is:

> How much does the Mercator projection inflate country areas, how does that depend on latitude, and how well does the theoretical Mercator area scale factor sec²(φ) predict it compared with an equal-area projection (Eckert IV)?

Headline results from [results/summary.md](results/summary.md), excluding the clipped Antarctica (n = 176):

- The median Mercator area ratio is **1.2063**. The maximum is **16.5433** (Greenland), followed by Norway at 9.3798 (Svalbard); the minimum is 1.0007 (Gabon).
- Eckert IV stays within **2.5e-6** of 1 for every country.
- sec²(φ) at the area-weighted centroid predicts the Mercator ratio within 1% for 156 countries and within 10% for 169. It always *underestimates*: the median ratio/sec² is 1.0010 and the maximum 1.5964 (Norway). The reason is Jensen's inequality, because sec²φ is convex in sin φ.
- All 177 countries converged. Sudan carries a geometry flag whose effect on area is about 5e-7, so it does not change the results. Antarctica is clipped at ±85.0511° and excluded from the statistics.

The components:

- The frontend renders 177 Natural Earth country features on one responsive SVG map, with a Mercator/Eckert IV blend slider, graticule, world outline, loading/error states, and a toggle for 30 equal-radius geographic circles.
- Native PostgreSQL/PostGIS stores those countries as MultiPolygon geometries in EPSG:4326. USA and Sudan self-intersections were repaired; all 177 geometries are valid, nonempty, and non-null.
- A stored generated column calculates WGS 84 ellipsoidal areas. All 177 values are positive and finite. A Berlin point-in-country query returned Germany and demonstrated the GiST spatial index in an execution plan.
- [backend/country_areas.py](backend/country_areas.py) computes the spherical reference area, the Mercator and Eckert IV areas and ratios, the 20/10/5 km convergence, the centroid latitude and sec²(φ) once per country. It stores them in `public.country_area_stats` and exports [results/country_areas.csv](results/country_areas.csv), [results/summary.md](results/summary.md) and a static JSON file. A pytest suite covers the pure calculation.
- The frontend lets you click or tap any country to see its panel. A **Distortion vs latitude** chart plots all countries' Mercator ratios against centroid latitude on a log axis, with the sec²φ curve overlaid.

The frontend loads database-backed GeoJSON through FastAPI. In native development, Vite proxies `/api` requests to the API. In Docker Compose, Nginx serves the production frontend and proxies those requests to FastAPI. A restricted `projection_api` role has verified read access to 177 countries. FastAPI exposes health, count and country GeoJSON endpoints, plus `/countries/areas` and `/countries/{adm0_a3}/areas`, which read the precomputed table. The original `/countries/GRL/areas` still works. Intermediate blend areas are not calculated or interpolated.

Docker Compose is implemented and locally verified for PostGIS, FastAPI, and the production frontend. An explicit setup-profile bootstrap imports the versioned GeoJSON, prepares geometries and areas, and creates the restricted API role. It refuses to overwrite an existing countries table. A separate `areas` setup service precomputes the statistics. On 2026-10-27 the whole Compose sequence was replayed on a fresh, empty volume with [compose.replay.yaml](compose.replay.yaml). Its API matched [results/country_areas.csv](results/country_areas.csv) to within 1.1e-13 relative; see the [database guide](database/README.md#fresh-volume-replay). GitHub Actions ([project1-ci.yml](../.github/workflows/project1-ci.yml)) runs frontend lint and build plus the backend pytest suite.

See the [frontend guide](frontend/README.md) to run the map, the [backend guide](backend/README.md) for endpoints and measurement details, the [database guide](database/README.md) for setup and read-only checks, and the [progress log](PROGRESS.md) for verification evidence. The database guide separates fresh setup from checks safe to run on the existing prepared database.

## Stack

- Frontend: React and TypeScript with Vite; D3.js with d3-geo and d3-geo-projection calculates SVG map paths; d3-scale drives the latitude chart.
- Database: PostgreSQL 18 with PostGIS 3.6, storing Natural Earth country geometries and generated geodesic areas. The database can run natively or in Docker Compose.
- Spatial tools: GDAL 3.13.3/ogr2ogr for importing data (OSGeo4W locally or the GDAL bootstrap image); QGIS installed. pyproj and Shapely calculate country projection areas, clipping and convergence checks; pytest tests them.
- Backend: Python 3.14, FastAPI, and Psycopg; uv manages the virtual environment and locked dependencies. Database passwords remain outside the repository.
- Containers: Docker Compose runs PostGIS, FastAPI, and an Nginx frontend; a named volume persists database data.

## Learning Goals

- D3 geographic projections and rendering.
- Projection distortion, Tissot's indicatrix, and geodesic versus planar area.
- PostGIS geometry versus geography, spatial indexing, and GeoJSON export.
- FastAPI endpoint design and database integration.
- Reprojection with pyproj and consistent coordinate reference systems.
- Docker images, containers, and multi-container configuration.

## Build Order

1. **Complete:** static Mercator and Eckert IV maps using local Natural Earth GeoJSON. The original side-by-side view established rendering before the single-map redesign.
2. **Complete:** finite-circle approximation of Tissot's indicatrix, a projection morph slider, and the single-map educational layout.
3. **Complete:** native PostgreSQL/PostGIS setup, ogr2ogr import, geometry validation/repair, stored geodesic areas, and a verified spatial-index query.
4. **Complete:** restricted database login, FastAPI GeoJSON, API-backed map, winding/rendering checks, and pyproj/Shapely projection statistics. These started with Greenland (2026-09-21) and were extended to all 177 countries on 2026-10-27: precomputed in PostGIS, exported to CSV, and tested with pytest.
5. **Complete and locally verified:** containerize PostGIS, FastAPI, and the production frontend with Docker Compose, including an explicit guarded data bootstrap, the `areas` precompute service, persistent storage, and private local configuration. Replayed on a fresh volume on 2026-10-27.
6. **Complete locally (2026-10-27):** any country can be selected by click, tap or keyboard to open its area panel. The distortion-vs-latitude chart is keyboard-navigable, the Method section is written for non-experts, and the layout was checked for contrast and at 320 px. CI was added. **Open:** the static GitHub Pages mode. `frontend/public/data/country_areas.json` is already generated for it.

The implemented area ratio is projected square meters divided by spherical reference square meters, using radius 6,371,007.1809 m for both. The stored WGS 84 ellipsoidal area is reported separately. Great-circle boundary densification at 20/10/5 km checks convergence. Greenland's Mercator ratio is approximately 16.5433 and Eckert IV's approximately 1. See the [method](backend/README.md#country-method), including how poles (Antarctica), the antimeridian and the centroid latitude are handled.

D3 uses a sphere while PostGIS geography uses the WGS 84 ellipsoid. The 3-degree circles are finite approximations, the morph is raw-coordinate interpolation, and intermediate blends generally preserve neither angles nor area. Mercator latitude is clamped at approximately +/-85.05 degrees, not geographically clipped. Each blend is fitted independently, so screen area is not directly comparable across slider positions. The panel marks only the exact endpoints as current; neither endpoint ratio describes an intermediate blend.

Country areas describe this generalized dataset, including database repairs, not authoritative national measurements. The all-country extension was requested on 2026-10-27 under the sprint override in the root CLAUDE.md. That override also supersedes the tutoring agreement below until 2026-10-30.

## Limitations

- **Not deployed.** GitHub Pages static data mode (Vite `base` `/projection-lab/`, reading JSON instead of `/api`) is not built. The app currently needs FastAPI and PostGIS. The geometry for static mode would also have to be exported, because `country_areas.json` holds statistics only.
- **CI not yet observed.** The workflow was linted with actionlint, and its steps were run locally. It has not run on GitHub because the branch was not pushed.
- **Generalised boundaries.** All areas describe Natural Earth 1:110m boundaries, including the database repairs of USA and Sudan. They are not official national figures.
- **Sphere, not ellipsoid.** Projection ratios use a sphere of radius 6,371,007.1809 m. The WGS 84 ellipsoidal area is reported separately and differs by −0.45% to +0.81% per country.
- **Antarctica** is clipped at ±85.0511° for its statistics and excluded from the summary statistics.
- **Sudan** carries a projected-geometry validity flag. A spike in its boundary self-intersects as great circles; the effect on area is about 5e-7, and the country is still included.
- **Blends.** Intermediate blends are neither measured nor area- or angle-preserving. Each blend is fitted independently, so screen sizes are not comparable across slider positions.
- **Circles.** The 3° circles approximate Tissot's infinitesimal indicatrix.
- **Map keyboard access.** The map itself is not keyboard-navigable; the country list and the chart are the keyboard routes. No screen-reader software was tested.
- **Browser tests are not committed.** The Playwright checks used for verification are ad hoc scripts, so CI does not run them.
- **Platform differences.** Results computed on Windows and in the Linux containers differ by at most about 1e-13 relative, because of floating-point differences between PROJ/GEOS builds.
- **Native replay.** The native (non-Docker) database setup has not been replayed end to end.
- **API hardening.** Database failures other than a missing statistics table still return a generic HTTP 500. There is no connection pool.

## Starting Experience

- Python: comfortable, including some pandas experience.
- SQL: basic SQL; limited PostGIS experience.
- Frontend: comfortable with TypeScript; has used Leaflet but not D3.
- Docker: conceptual familiarity, no implementation experience.
- FastAPI: new.
- Coding syntax recall and independent debugging need practice after relying heavily on AI tools.

## Tutoring Agreement

The sprint override in the root CLAUDE.md supersedes this agreement until 2026-10-30; until then the agent implements directly.


- Work as a step-by-step tutor, not an autonomous implementation agent. The learner writes and runs the code.
- Do not generate whole files or apply changes unless explicitly authorized. Permission to create these initial notes is not permission to implement the app.
- As requested on 2026-09-21, use larger coherent implementation-and-verification batches and fewer confirmation stops. Wait for verification before advancing to a new batch.
- Before explaining a new concept, library, or API, link to its specific official documentation page and pause for the learner to skim it.
- Explain reasoning and trade-offs, then provide complete implementations for the agreed batch, with exact locations, commands, and checks. The learner now prefers complete code rather than fill-in-the-blanks exercises.
- Direct edits still require explicit authorization; permission for one batch does not authorize subsequent implementation.
- Allow time for slow syntax recall and basic mistakes. Encourage independent debugging without withholding needed help.
- Flag gotchas when relevant to the current step, including coordinate order, CRS consistency, geometry versus geography, and D3 scale/translate behavior.
- Never ask the learner to paste code into chat. Ask them to reference a workspace file with the VS Code file picker or select relevant lines, and wait until they say it is ready for review.
- Review and explain issues without rewriting the learner's work wholesale.
- After a verified step, briefly recap what was built and why it matters. Identify the next logical step, but wait for an explicit go-ahead before starting it.
- Do not skip ahead in the build order, even when doing so appears more efficient.
- Keep React refreshers brief and prioritize GIS implementation. Do not require written answers to map-observation questions before proceeding.

## Session Continuity

Use [PROGRESS.md](PROGRESS.md) for the current checkpoint and dated learning log. Keep this brief stable unless the project goals or teaching preferences change.

At the end of a step, the tutor supplies a short checkpoint summary for the learner to record. The tutor edits these notes only when explicitly asked.

To resume in a new chat, reference both this file and the progress log using the VS Code file picker and ask the tutor to resume from the current checkpoint. The first action is to confirm the checkpoint, not to scaffold or implement the project automatically.
