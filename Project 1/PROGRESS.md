# Project 1 Progress

Project scope and tutoring rules: [README.md](README.md).

## Current Checkpoint

- Last updated: 2026-09-09.
- Phase: 2 complete; Phase 3 not started.
- Status: single-map educational redesign completed at the learner's request after implementing the circle overlay and morph slider.
- Stack: React, TypeScript, Vite, d3-geo, and d3-geo-projection.
- Implemented: local Natural Earth 1:110m countries, loading/error state, one morphing SVG map, graticule, world outline, 30 finite geographic circles with a toggle, keyboard-accessible blend slider, and projection explanations.
- Verification evidence: production build and ESLint passed. Browser checks loaded 177 features and verified one SVG, valid paths at blend values 0, 0.5, and 1, 0/30 circles when toggled, keyboard controls, and no horizontal overflow at 1600, 1024, 768, 390, and 320 pixels.
- Blockers: none known.
- Important constraints: finite circles approximate infinitesimal indicatrices; intermediate blends generally preserve neither angles nor area; the Mercator contribution caps latitude at approximately +/-85.05 degrees. Refitting each blend means screen areas are not on a common scale.
- Next agreed action: return to tutor mode for Phase 3; establish whether PostgreSQL/PostGIS and QGIS/GDAL are installed before choosing setup steps. No database installation has begun.
- Teaching pace: brief React refreshers only; prioritize GIS implementation, without mandatory observation questions.

## Phase Tracker

- [x] Phase 1: static Mercator and Eckert IV maps using local Natural Earth GeoJSON.
- [x] Phase 2: Tissot's indicatrix overlay and projection morph slider.
- [ ] Phase 3: PostGIS setup, Natural Earth import, and geodesic areas.
- [ ] Phase 4: FastAPI GeoJSON and distortion statistics endpoints; frontend integration.
- [ ] Phase 5: Docker Compose for database and API.
- [ ] Phase 6 (stretch): country area comparison panel and deployment polish.

## Learning Log

### 2026-09-08: Project Notes

- Recorded the project brief, learning goals, phase order, and tutoring preferences.
- Created this checkpoint to support continuity across chats.
- No setup, application implementation, or technical lesson has begun.

## How to Update This Log

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

## Updating Future Checkpoints

After each completed step, update the current checkpoint and append a short dated entry containing:

- What was built or changed, with links to relevant workspace files.
- How it was verified: the command and result, or the browser behavior checked.
- What was learned, including any mistake debugged and its cause.
- Any unresolved question or blocker.
- The next agreed action and whether the learner has authorized starting it.

Only mark a phase complete once its behavior has been verified. Keep unfinished work explicit rather than treating code that was merely written as working code.