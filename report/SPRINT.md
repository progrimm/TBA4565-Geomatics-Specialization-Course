# Sprint plan and Claude Code prompts (27–30 Oct 2026)

Scope: three projects, each finished properly, published together as **one website**: a "My GIS module" homepage on GitHub Pages where visitors choose a project.

| | Project | Focus | URL path |
| --- | --- | --- | --- |
| 1 | **Projection Lab**: how much Mercator distorts country areas | GI Science | `/projection-lab/` |
| 2 | **Trondheim 3D**: 3D city model, public shelters, nearest-shelter analysis | GI Systems | `/trondheim-3d/` |
| 3 | **3DGS Viewer**: a globe gallery of georeferenced Gaussian splats around the world (inspect, measure, check alignment, compare with a mesh), plus a "Viewer lab" benchmarking popular 3DGS web viewers on the same splat | 3D GIS | `/3dgs-viewer/` |

(The earlier Project 3, the Lillehammer flight sim, was scrapped. The new Project 3 is the 3DGS view, split out of Project 2.)

Run each numbered session as a **fresh Claude Code session** from the repo root. Between sessions, run `/clear` or start a new one, and name each with `/rename`. Paste the prompt as-is.

## Order

Step 0, then **three tracks in three terminals**:

| Track A: Project 1 | Track B: Project 2 | Track C: Project 3 |
| --- | --- | --- |
| 1. All-country distortion analysis | 3. **Split Project 2 into 2 and 3** (do this first) | *waits for session 3* |
| 2. Project 1 hardening | 4. Camera fixes and nearest-shelter analysis | 6. Georeferenced splat gallery |
| | 5. Project 2 hardening | 7. Viewer lab: comparing 3DGS web viewers |
| | | 8. Project 3 hardening |

Then: 9. Build and deploy the website → 10. Evidence and figures → 11. Back to the chat for the report.

Tracks A and B can start right away. Track C starts once session 3 has committed the split. Each track touches its own folder. For full isolation, start each in its own git worktree (https://code.claude.com/docs/en/worktrees).

**Time check:** this is a lot for three days. If you fall behind, cut in this order:
1. In session 7, drop ArcGIS and Babylon.js, keeping Spark, PlayCanvas and CesiumJS.
2. Cut session 8 down to the README theory section only.
3. Drop parts of session 5.
4. Drop the performance and accessibility items in sessions 2 and 5.

Never cut session 9: the website is the deliverable.

---

## 0. Before you start (5 min, by hand)

```powershell
git add -A                      # includes the deletion of the old Project 3 and the new sprint files
git commit -m "chore: drop old project 3, add sprint setup"
git switch -c sprint
# install the two custom skills (they were delivered into report/skills/)
New-Item -ItemType Directory -Force .claude/skills | Out-Null
Copy-Item -Recurse -Force report/skills/* .claude/skills/
claude
```

In Claude Code, run `/context` once to confirm the root `CLAUDE.md` and the two skills loaded. Optionally, run `/plugin` and enable the `cesiumjs-skills` plugin for the repo, so the Cesium sessions get it.

---

# Track A: Project 1, Projection Lab

## 1. All-country distortion analysis (~half a day)

Press **Shift+Tab** until the status bar shows plan mode, then paste:

```text
Read @"Project 1/README.md", @"Project 1/PROGRESS.md", @"Project 1/backend/greenland_areas.py", @"Project 1/backend/main.py" and @"Project 1/frontend/src/App.tsx".

Goal: extend Project 1 from Greenland-only to all 177 countries, so the report can answer:
"How much does the Mercator projection inflate country areas, how does that depend on latitude, and how well does the theoretical Mercator area scale factor sec²(φ) predict it compared with an equal-area projection (Eckert IV)?"

Requirements:
1. Backend: generalise greenland_areas.py into a module that computes, for every country: the spherical reference area, Mercator and Eckert IV projected areas, both area ratios, the 20/10/5 km convergence check, the centroid latitude, and the theoretical sec²(φ) at that latitude. Keep the existing method (common sphere R = 6371007.1809 m, great-circle densification). Mercator is undefined at the poles: decide and document how Antarctica and any geometry beyond ±85.0511° are handled (e.g. clip to the Web Mercator limit and flag the country). Greenland's results must stay identical to before. If any country fails convergence, report it instead of hiding it.
2. Precompute the results once into a PostGIS table (a script in Project 1/database or a backend CLI command), not per request. Expose GET /countries/areas (all) and GET /countries/{adm0_a3}/areas. The existing Greenland endpoint must keep working.
3. Tests: add pytest (a dev dependency via uv) with tests for the pure calculation: a polygon with a known spherical area, an Eckert IV ratio ≈ 1, a small polygon at latitude φ whose Mercator ratio ≈ sec²(φ), and the Antarctica/pole handling.
4. Frontend: clicking or tapping any country shows its panel (generalise the Greenland panel). Add a "Distortion vs latitude" chart: a scatter of Mercator area ratio against centroid latitude for all countries, with the sec²(φ) curve overlaid and a log y-axis. Hovering a point identifies the country; clicking it selects the country on the map. Use d3 (already installed), with no new chart library. Keep the slider, circles, keyboard support and loading/error states.
5. Export the full results to Project 1/results/country_areas.csv, plus a short summary (median and max inflation, the most and least inflated countries, how far the ratio deviates from sec²(φ) at the centroid and why) to Project 1/results/summary.md.

Ask me about anything ambiguous before you plan. The plan must list the files to change, the Antarctica decision, and how you will verify each step.
```

When the plan looks right, approve it, then:

```text
Implement the plan step by step. After each step, run the checks from CLAUDE.md and show me the evidence. Update Project 1/README.md, the backend README and PROGRESS.md as you go. Commit after each verified step.
```

Finish with `/code-review` and fix only real bugs.

## 2. Project 1 hardening (~1–2 h)

```text
Work only in Project 1 (plus a new workflow file in .github/workflows/). Read @"Project 1/README.md" and @"Project 1/PROGRESS.md". Goal: close every open item so the project is complete and reproducible.

1. CI: add .github/workflows/project1-ci.yml (modelled on project2-ci.yml, path-filtered to Project 1/) that runs the frontend lint and build and the backend pytest suite via uv.
2. Reproducibility: do the fresh-volume replay the docs list as not yet verified. Start a new, empty Compose project name/volume (do NOT touch or delete the existing database volume), run the bootstrap, the area precompute and the app, and confirm the API returns 177 countries with the same areas as results/country_areas.csv. Record the exact commands and the outcome in the database README and PROGRESS.md.
3. In-app explanation: update the collapsed Method section so a non-expert understands what they see: Mercator is conformal, Eckert IV is equal-area, Tissot's indicatrix and the circles, why area grows with sec²(φ), the sphere vs ellipsoid distinction, and that intermediate blends aren't measured. Keep it short.
4. Accessibility and robustness: keyboard access to country selection and the chart, visible focus, sufficient colour contrast, no layout overflow at 320 px. Check with Playwright and screenshots.
5. Docs: remove the outdated "Greenland-only" wording from all Project 1 READMEs and the root README, update the status and build-order sections, and list the remaining limitations honestly.
Run all checks from CLAUDE.md, then /code-review. Commit each step.
```

---

# Track B: Project 2, Trondheim 3D

## 3. Split Project 2 into Project 2 and Project 3 (~45 min, do first)

```text
Read the root CLAUDE.md, @"Project 2/CLAUDE.md" and @"Project 2/README.md". Split the Gaussian splat showcase out of Project 2 into a new standalone app in "Project 3/".

1. Create Project 3 as its own Vite + React (JavaScript/JSX) + CesiumJS app with the same tooling as Project 2: the same pinned Cesium version, ESLint, Prettier, Vitest, .env.example with VITE_CESIUM_TOKEN, and the same folder structure (layers/, hooks/, components/, state/, utils/). Reuse Project 2's patterns and copy shared helpers (messages store, camera utils, html escaping) rather than linking across folders, so each project builds on its own. Don't over-engineer a shared package.
2. Move the splat layer, its config, its button and the CESIUM_EVALUATION_TOKEN exception into Project 3. On startup, Project 3 opens directly on the splat.
3. Remove every trace of the splat from Project 2: code, config, UI, tests, README and its CLAUDE.md scope and status.
4. Add .github/workflows/project3-ci.yml, modelled on project2-ci.yml and path-filtered to Project 3/.
5. Write Project 3/README.md and Project 3/CLAUDE.md, modelled on Project 2's: purpose, how to run, scripts, structure, the token exception, attribution. Mark the status as "split from Project 2, features pending".
6. Update the root README with three projects.
Both projects must pass lint, format check, tests and build, and both must run in the browser (check with Playwright). Commit as "refactor: split 3DGS showcase into Project 3".
```

## 4. Camera fixes and nearest-shelter analysis (~1–2 h)

```text
Work only in Project 2. Read @"Project 2/CLAUDE.md" and @"Project 2/README.md". The root CLAUDE.md sprint override applies.

1. The Nidarosdomen and Bakklandet camera views are estimates. Look up their real coordinates (name your source), convert to ellipsoidal heights as config.js already does, and verify with Playwright screenshots that each landmark is centred and clearly visible. Iterate until it is.
2. Add one small spatial-analysis feature: "Nearest shelter". The user clicks anywhere on the ground and the app shows the nearest public shelter, its geodesic distance (Cesium EllipsoidGeodesic) and its capacity, and draws a line to it. Put the pure distance/nearest logic in utils/ with Vitest tests (include a fixture with known distances). Show the total number of shelters and the total capacity in the panel.
3. Lint, format check, tests and build must pass. Check the UI at desktop and mobile width. Update the README (features, status) and the "Current status" section of CLAUDE.md. Commit each step.
```

## 5. Project 2 hardening (~1 h)

```text
Work only in Project 2. Goal: close the remaining gaps so the project is complete.

1. Data provenance: re-run `npm run data:shelters` against the DSB WFS. Record the fetch date, feature count, WFS URL, layer name and CRS conversion in the README, and show "data fetched <date>" in the shelter credit. If the service fails, keep the committed file and say so.
2. Robustness: add tests where they matter and are missing (e.g. the shelter GeoJSON parsing with bad or missing attributes, and nearest-shelter edge cases such as an empty list or identical points). Confirm a failed layer still leaves the app usable by blocking one request in Playwright.
3. Performance: measure first-load time and frame rate at the Midtbyen view with OSM Buildings on, with the current maximumScreenSpaceError and with one alternative value. Record the numbers and the chosen setting in the README.
4. Accessibility: keyboard access to all panel controls, visible focus, labels, and reduced-motion still respected.
5. Docs: update the README status and limitations (ellipsoidal vs NN2000 heights, the EUREF89 ≈ WGS84 assumption, OSM building completeness).
Run all checks from CLAUDE.md, then /code-review. Commit each step.
```

---

# Track C: Project 3, 3DGS Viewer (start after session 3)

Project 3 has two parts:
- **Globe gallery (session 6):** several georeferenced splats from different parts of the world on one Cesium globe.
- **Viewer lab (session 7):** the same splat rendered in several popular 3DGS web viewers, with a benchmark.

The research question covers both: *"How well do current web technologies display georeferenced 3D Gaussian splats, and what do geospatial viewers (CesiumJS) offer over general-purpose splat viewers?"*

## 6. Georeferenced splat gallery (~2–3 h)

Plan mode, then:

```text
Work only in Project 3. Read @"Project 3/CLAUDE.md" and @"Project 3/README.md". Goal: a CesiumJS globe gallery of several georeferenced 3D Gaussian splats in different places, which can be inspected, measured and checked against independent geodata.

Candidate splats. These are all public Cesium ion assets used in CesiumJS's own Sandcastle examples (CesiumGS/cesium, packages/sandcastle/gallery):
- ion 4547222: Microsoft Redmond campus, USA (hierarchical LOD, captured with Bentley). Already in the app.
- ion 3667783: from the "3D Tiles Gaussian Splats" example. Location not stated.
- ion 3667784: a power station as splats, and ion 3443919: the same power station as a triangle mesh. Both come from the "3D Tiles Gaussian Splats – Mesh Comparison" example.
- An iTwin dam splat: iTwinId 04ba725f-f3c0-4f30-8014-a4488cbd612d, realityDataId 4afd5d69-3ba7-491d-86cd-3d86d43db907. It loads via Cesium.ITwinData.createTilesetForRealityDataId with the public share key in the "itwin-gaussian-splats" example. That key expires around 1 Dec 2026, so say so in the README. The example also shifts this tileset by (-1, 9, -8) m to match Cesium World Terrain. Record that as an alignment finding.

First, verify each candidate: does it load with my token, or only with the evaluation token? Find its location by decoding its root transform or bounding sphere. Identify the place, naming the source you used. Record its credits and terms. Drop any that fail and tell me. Then ask me whether I have a georeferenced splat of my own to add.

1. Gallery: a panel listing every working splat with its place, country, capture source, data type and credits. Selecting one flies there. The opening view is a globe with a marker for each splat.
2. Georeferencing inspector: decode the selected tileset's root transform into the origin's longitude, latitude and ellipsoidal height, the orientation of its local axes relative to East-North-Up, and the bounding-sphere radius. Explain the coordinate chain: local splat coordinates → ECEF (EPSG:4978) → WGS 84 geographic (EPSG:4979). Put the pure math in utils/ with Vitest tests, e.g. a known ENU frame at a known lon/lat.
3. Measurement tool: click two points (scene.pickPosition) to get the straight-line 3D distance, the horizontal geodesic distance and the height difference, with a clear button. Test the math. State in the UI that picking accuracy on splats is limited.
4. Alignment check: toggle Cesium World Terrain, OSM Buildings and imagery, and add a splat opacity control. For each splat with usable reference data, measure the offset on 3–5 clear features (building corners, road edges) to estimate the horizontal and vertical offset. Record a results table, screenshots and the method in the README.
5. Splat vs mesh: for the power station, add a split-screen slider (scene.splitPosition with splitDirection, as in the Sandcastle example) comparing the splat and the mesh. Describe the visible differences, e.g. thin structures such as power lines.
6. Performance panel: FPS, tileset memory (totalMemoryUsageInBytes), loaded tile count and time to first render. Record the numbers per splat in the README.
7. Keep the loading and error-message patterns from Project 2. Credits must be visible for every asset. It must work at desktop and mobile width.
The plan must include how each step is verified. Lint, format check, tests and build must pass. Commit each step.
```

## 7. Viewer lab: comparing 3DGS web viewers (~2–3 h)

Plan mode, then:

```text
Work only in Project 3. Add a "Viewer lab": the same splat rendered in several popular 3DGS web viewers, with a reproducible benchmark and a comparison table.

Viewers. Check each project's current official docs and npm page, use the latest stable version, and pin it:
- Spark (World Labs; Three.js-based)
- PlayCanvas engine (gsplat component; the engine behind SuperSplat)
- Babylon.js (GaussianSplattingMesh)
- CesiumJS, with the same splat as 3D Tiles. Tell me the Cesium ion upload and placement steps if I need to do them by hand.
- Optional, only if time allows: the ArcGIS Maps SDK for JavaScript GaussianSplatLayer, with Esri's public sample layer (portal item 01596d71a5ce40ec8a6f21baad6e5b6f, an industrial area in Vietnam). It can't load our test splat, so give it a qualitative comparison only, and check whether it needs an API key and what its licensing terms are.

Test splat: first ask me whether I have a splat file I'm allowed to publish. Otherwise find a small (< 50 MB) PLY whose licence allows redistribution, and record its source and licence. Store it in Project 3/public/splats/. If a viewer prefers its own format (SPZ, SOG, ksplat), benchmark the shared PLY in every viewer, and also note the native format's file size.

Architecture: give each viewer its own page (a Vite multi-page entry), so each one has its own WebGL context and bundle. Give them all the same canvas size and splat, and as similar an initial camera as possible. A Lab index page links to every viewer and shows the results table. Use the same "← My GIS module" bar as the rest of the site.

Benchmark: a Playwright script, run headed with the GPU on my machine. Record the browser, GPU and OS. Do 3 runs per viewer and report the median of:
- time to first rendered frame
- mean and 5th-percentile FPS during a scripted 10 s orbit
- JS heap size
- network bytes
- gzipped bundle size
Save the results to Project 3/results/viewer-benchmark.csv and as a table in the README.

Qualitative table, one row per viewer: licence, underlying engine, supported formats (ply, splat, ksplat, spz, sog, 3D Tiles), LOD and streaming, georeferencing and CRS support, GIS features (terrain, measurement, analysis), mobile behaviour, documentation quality, and lines of integration code.

Lint, format check, tests and build must pass. Commit each step.
```

## 8. Project 3 hardening (~1 h)

```text
Work only in Project 3. Goal: make it complete and well documented.
1. README theory section, short and accurate, with references (only real ones): what 3D Gaussian Splatting is (Kerbl et al., 2023, "3D Gaussian Splatting for Real-Time Radiance Field Rendering", ACM TOG); how splats differ from meshes and point clouds; splat file formats (PLY, SPZ, SOG, ksplat); how Cesium streams splats as 3D Tiles (KHR_gaussian_splatting and KHR_gaussian_splatting_compression_spz; confirm against the installed CesiumJS version); and why georeferencing matters for GIS use.
2. Limitations: the evaluation-token exception and whether it is acceptable under Cesium ion's terms for a public site; the iTwin share-key expiry; picking accuracy on splats; the alignment check uses a few measurements and is not a formal accuracy assessment; the benchmark covers one machine and one splat, and camera paths differ slightly between viewers.
3. Accessibility pass (keyboard, focus, labels, reduced motion) and tests for any untested pure logic.
Run all checks from CLAUDE.md, then /code-review. Commit each step.
```

---

# Final steps

## 9. Build and deploy the "My GIS module" website (~2–3 h)

The final product is **one website on one GitHub Pages URL**. Its homepage has a "My GIS module" header, and visitors choose one of the three projects from it. Each project opens under its own path and links back home.

Plan mode, then:

```text
Read the root CLAUDE.md and README.md and the READMEs of Projects 1, 2 and 3. Plan one website, deployed as one project to GitHub Pages:

1. Homepage: a new `site/` folder with a small Vite app or plain HTML/CSS, whichever is simpler to build and maintain. It needs:
   - A header "My GIS module" with the subtitle "TBA4565 Specialization Subject: GI Science and Systems, NTNU, autumn 2026", and my name, Åmund Grimstad.
   - A short intro: the module goal (build practical GIS experience through small, achievable projects) in 2–3 sentences.
   - Three project cards. Each has a title, the question it answers in one line, a screenshot, a focus badge, stack tags, and an "Open project" button:
     - "Projection Lab" (Project 1, GI Science): how much the Mercator projection distorts country areas.
     - "Trondheim 3D" (Project 2, GI Systems): 3D city model, public shelters and nearest-shelter analysis.
     - "3DGS Viewer" (Project 3, 3D GIS): a globe gallery of georeferenced Gaussian splats around the world, plus a lab comparing popular 3DGS web viewers.
   - A footer with data credits (Natural Earth, OSM, DSB, Cesium, and every splat's source) and a link to the GitHub repo.
   - It must look polished and distinctive, not a generic template. Use the frontend-design skill or plugin if it's available. It must work at 390 px and 1600 px.
2. URL structure: `/` is the homepage, `/projection-lab/` is Project 1, `/trondheim-3d/` is Project 2 and `/3dgs-viewer/` is Project 3. Set the Vite `base` for each app so every asset loads under its subpath.
3. Unified navigation: all three apps (including every Viewer lab page) get a small, consistent "← My GIS module" link or top bar back to the homepage. It must not cover the map or Cesium controls, and must work on mobile. Share the colours and font between the homepage and the link bars so everything feels like one site.
4. Project 1 on Pages: the FastAPI + PostGIS backend can't run there. Add a static data mode: a script exports the API responses (the country GeoJSON and all area results) to JSON files, and the frontend reads those when VITE_DATA_MODE=static. Docker Compose stays the reference full-stack setup. Document the difference honestly in the README.
5. One workflow, .github/workflows/pages.yml: build the homepage and all three apps and assemble them into one Pages artifact. Run it on pushes to main. Keep the existing CI workflows working.
6. The Cesium ion token for Projects 2 and 3 comes from a GitHub Actions secret. Tell me exactly which secret to create, and how to restrict the token to the Pages URL in Cesium ion.
7. Update the root README into the front page of the whole repo: the site URL, the structure, and how to build the whole site locally (one command, e.g. a root script that builds everything into `dist-site/` and previews it).

List everything I must do by hand in GitHub (repo visibility, Pages source = GitHub Actions, secrets) as a checklist. After deployment, open the live homepage with Playwright, click through to all three projects and back, and confirm there are no console errors or 404s at desktop and mobile width. Show me the screenshots.
```

## 10. Figures and evidence for the report (~1 h, mostly unattended)

These are the two custom skills. Run each one in a fresh session, after session 9:

```text
/report-evidence project-1
/report-evidence project-2
/report-evidence project-3
/report-figures project-1
/report-figures project-2
/report-figures project-3
/report-figures site
```

`report-evidence` runs in a forked subagent, so the heavy reading stays out of your main context. Afterwards, check `report/notes/*.md` for anything marked UNVERIFIED and look through `report/figures/`. Running the figures skill after session 9 means the screenshots come from the live site with the "← My GIS module" bars in place.

## 11. Back to the Claude chat for the report

Come back to the chat where we set this up and say the code is done. We then pick the report format, I draft from `report/notes` and `report/figures`, and an independent reviewer grades the draft against the rubric.

---

## Claude Code habits worth learning (docs: https://code.claude.com/docs/en/best-practices)

- **Plan mode (Shift+Tab)** for multi-file work; **Ctrl+G** edits the plan in your editor before you approve it. Skip planning for one-line fixes.
- **Give it a check it can run.** Tests, build, lint and screenshots are what let it finish without you. The root CLAUDE.md lists them.
- **Context is the scarce resource.** Use `/clear` between unrelated tasks. After two failed corrections, `/clear` and write a better prompt. `/compact focus on X` keeps what matters. `/btw` asks a side question without polluting the context.
- **Esc** stops it; **Esc Esc** or `/rewind` restores earlier code and conversation. Use git for anything done through Bash.
- **`@file` references** beat describing where code lives.
- **Subagents** for research ("use a subagent to investigate…") keep the main session clean.
- **Parallel sessions:** tracks A, B and C are a real example. Use one terminal per track, or worktrees.
- **Writer/reviewer:** `/code-review`, or a second fresh session reviewing the diff, so the code isn't graded by its author.
- **Skills** (`.claude/skills/<name>/SKILL.md`) for repeatable workflows: you just used two. **CLAUDE.md** is for rules that apply every session, so keep it short. **Hooks** are for rules that must never be skipped, e.g. "run lint after every edit".
- **Bundled skills** to try: `/verify` (builds and runs the app to confirm a change), `/run`, `/debug`, `/code-review`, `/doctor`.
