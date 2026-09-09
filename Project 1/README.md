# Project 1: Comparing Map Projections

## Purpose

Build a small GIS web app comparing Mercator and Eckert IV projections through one interactive morphing map, using country shapes and areas to explore cartographic distortion, including the Greenland/Africa comparison. The original side-by-side proof of concept was replaced by this single-map educational layout at the learner's request on 2026-09-09.

The learning process matters as much as the finished app: rebuild hands-on coding fluency, practice debugging, and develop a habit of reading official documentation.

## Planned Stack

- Frontend: React and TypeScript with Vite; D3.js with d3-geo and d3-geo-projection calculates SVG map paths.
- Backend: Python and FastAPI, serving GeoJSON and computed distortion statistics.
- Database: PostgreSQL with PostGIS, storing Natural Earth country geometries and precomputed geodesic areas.
- Spatial tools: ogr2ogr for importing data and pyproj for reprojection in Python.
- Deployment: Docker Compose for the database and API.

## Learning Goals

- D3 geographic projections and rendering.
- Projection distortion, Tissot's indicatrix, and geodesic versus planar area.
- PostGIS geometry versus geography, spatial indexing, and GeoJSON export.
- FastAPI endpoint design and database integration.
- Reprojection with pyproj and consistent coordinate reference systems.
- Docker images, containers, and multi-container configuration.

## Build Order

1. Static frontend proof of concept: render Mercator and Eckert IV side by side from a local/static Natural Earth GeoJSON file. No backend yet.
2. Add a Tissot's indicatrix overlay and a projection morph slider.
3. Set up PostgreSQL and PostGIS, import Natural Earth data with ogr2ogr, and compute true geodesic country areas.
4. Build FastAPI endpoints for GeoJSON and distortion statistics, replacing the static frontend data source.
5. Containerize the database and API with Docker Compose.
6. Stretch: add a country click/hover panel comparing true and projected areas, plus deployment polish.

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
- Introduce only one small, ordered task at a time. Wait for the learner to implement and verify it before advancing.
- Before explaining a new concept, library, or API, link to its specific official documentation page and pause for the learner to skim it.
- Explain the reasoning and trade-offs before providing a small, focused snippet, such as one function, query, endpoint, or configuration block.
- When reasonable, offer a hint and let the learner attempt the task before showing code.
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