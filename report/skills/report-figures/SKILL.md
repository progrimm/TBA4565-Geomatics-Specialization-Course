---
name: report-figures
description: Capture report-ready screenshots of the TBA4565 web apps (Project 1, 2 or 3, or the homepage) into report/figures/ with draft captions. Use when asked for figures or screenshots for the report.
argument-hint: "[project-1|project-2|project-3|site] [optional: what to show]"
---

Capture report figures for: $ARGUMENTS

1. Read `report/figures/FIGURES.md` if it exists, so names and numbering stay consistent.
2. Run the app. Prefer the deployed GitHub Pages URL if it is live; otherwise use the dev server. For Project 1, the API and database must be running, or use static data mode if it exists.
3. Use Playwright with Chromium. Use `npx playwright` and don't add it to project dependencies. Capture PNGs at 1600×1000 (desktop) and, where the mobile layout matters, 390×844 with deviceScaleFactor 2.
   - Wait until everything has loaded. For Cesium, wait until `viewer.scene.globe.tilesLoaded` (or the tileset's `allTilesLoaded` event) is true, then allow a ~2 s settle. Never capture half-loaded tiles.
4. Default shot list, unless the arguments say otherwise:
   - project-1: Mercator endpoint; Eckert IV endpoint; 0.5 blend with circles on; a selected-country panel; the distortion-vs-latitude chart with a hovered point; mobile view.
   - project-2: Midtbyen overview with buildings; a shelter InfoBox open; a nearest-shelter result with its line; mobile bottom sheet.
   - project-3: the empty start screen; a splat file loaded with the file-facts panel; the up-axis fix before and after; a two-point distance measurement; mobile view. Project 3 ships no splat, so use the file named in the arguments (or ask for one).
   - site: the "My GIS module" homepage at desktop and mobile width (run `/report-figures site`).
5. Save each one as `report/figures/<project>-<nn>-<short-slug>.png`. Open every image and check it: tiles loaded, labels readable, no error banners, nothing cut off. Retake it if it fails any check.
6. Append one row per image to `report/figures/FIGURES.md` with: the file name, what it shows, a draft caption (one sentence telling the reader what to notice), and the data credit the caption must include (OSM, DSB, Natural Earth, Cesium, the splat's source...).

Do not change application code to make a screenshot look better. Report the problem instead.
