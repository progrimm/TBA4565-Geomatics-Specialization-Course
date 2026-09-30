# Project 1: Comparing Map Projections

## Purpose

Build a small GIS web app comparing Mercator and Eckert IV projections through one interactive morphing map, using country shapes and areas to explore cartographic distortion, including the Greenland/Africa comparison. The original side-by-side proof of concept was replaced by this single-map educational layout at the learner's request on 2026-09-09.

The learning process matters as much as the finished app: rebuild hands-on coding fluency, practice debugging, and develop a habit of reading official documentation.

## Current State

Phases 1-3 are complete. As of 2026-09-21, Phase 4's local integration and Greenland-only statistics are implemented:

- The frontend renders 177 Natural Earth country features on one responsive SVG map, with a Mercator/Eckert IV blend slider, graticule, world outline, loading/error states, and a toggle for 30 equal-radius geographic circles.
- Native PostgreSQL/PostGIS stores those countries as MultiPolygon geometries in EPSG:4326. USA and Sudan self-intersections were repaired; all 177 geometries are valid, nonempty, and non-null.
- A stored generated column calculates WGS 84 ellipsoidal areas. All 177 values are positive and finite. A Berlin point-in-country query returned Germany and demonstrated the GiST spatial index in an execution plan.

The frontend loads database-backed GeoJSON through FastAPI. In native development, Vite proxies `/api` requests to the API. In Docker Compose, Nginx serves the production frontend and proxies those requests to FastAPI. A restricted `projection_api` role has verified read access to 177 countries. FastAPI exposes health, count, country GeoJSON, and Greenland area endpoints. The map highlights Greenland and shows ellipsoidal/spherical references and endpoint projection results alongside the morph slider. Intermediate blend areas are not calculated or interpolated.

Calculation scope is deliberately Greenland-only. Docker Compose is implemented and locally verified for PostGIS, FastAPI, and the production frontend. An explicit setup-profile bootstrap imports the versioned GeoJSON, prepares geometries and areas, and creates the restricted API role. The bootstrap was verified against the current container database; it refuses to overwrite an existing countries table. This does not establish a complete independent fresh-volume replay or production security hardening.

See the [frontend guide](frontend/README.md) to run the map, the [backend guide](backend/README.md) for endpoints and measurement details, the [database guide](database/README.md) for setup and read-only checks, and the [progress log](PROGRESS.md) for verification evidence. The database guide separates fresh setup from checks safe to run on the existing prepared database.

## Stack

- Frontend: React and TypeScript with Vite; D3.js with d3-geo and d3-geo-projection calculates SVG map paths.
- Database: PostgreSQL 18 with PostGIS 3.6, storing Natural Earth country geometries and generated geodesic areas. The database can run natively or in Docker Compose.
- Spatial tools: GDAL 3.13.3/ogr2ogr for importing data (OSGeo4W locally or the GDAL bootstrap image); QGIS installed. pyproj and Shapely calculate Greenland projection areas and convergence checks.
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
4. **Complete for the agreed local Greenland-only scope:** restricted database login, FastAPI GeoJSON, API-backed map, winding/rendering checks, pyproj/Shapely endpoint statistics, and integrated Greenland results. See the progress log for verification and remaining hardening; production readiness and worldwide statistics are not implied.
5. **Complete and locally verified:** containerize PostGIS, FastAPI, and the production frontend with Docker Compose, including an explicit guarded data bootstrap, persistent storage, and private local configuration.
6. **Stretch:** country click/hover panel comparing ellipsoidal and projected areas, followed by deployment polish.

The implemented area ratio is projected square meters divided by spherical reference square meters, using radius 6,371,007.1809 m for both. The stored WGS 84 ellipsoidal area is reported separately. Great-circle boundary densification at 20/10/5 km checks convergence. Greenland's Mercator ratio is approximately 16.5433 and Eckert IV's approximately 1; see the [method and result table](backend/README.md#greenland-method).

D3 uses a sphere while PostGIS geography uses the WGS 84 ellipsoid. The 3-degree circles are finite approximations, the morph is raw-coordinate interpolation, and intermediate blends generally preserve neither angles nor area. Mercator latitude is clamped at approximately +/-85.05 degrees, not geographically clipped. Each blend is fitted independently, so screen area is not directly comparable across slider positions. The panel marks only the exact endpoints as current; neither endpoint ratio describes an intermediate blend.

Country areas describe this generalized dataset, including database repairs, not authoritative national measurements. The learner authorized Greenland-only statistics; broader country calculations remain out of scope.

## Starting Experience

- Python: comfortable, including some pandas experience.
- SQL: basic SQL; limited PostGIS experience.
- Frontend: comfortable with TypeScript; has used Leaflet but not D3.
- Docker: conceptual familiarity, no implementation experience.
- FastAPI: new.
- Coding syntax recall and independent debugging need practice after relying heavily on AI tools.

## Tutoring Agreement

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
