# My GIS module (TBA4565)

Learning projects for the NTNU course TBA4565 Specialization Subject: GI Science and Systems, autumn 2026, by Åmund Grimstad. Three small web GIS apps, one per theme of the module, published together as one static website on GitHub Pages:

**<https://progrimm.github.io/TBA4565-Geomatics-Specialization-Course/>**. This URL serves the site once `pages.yml` has run on `main`; see [Deployment](#deployment).

| Path | Project | Theme | Question |
| --- | --- | --- | --- |
| `/` | [Homepage](site/) | | "My GIS module": introduction, one card per project, credits |
| `/projection-lab/` | [Project 1: Projection Lab](Project%201/README.md) | GI Science | How much does the Mercator projection inflate country areas, and how well does sec²φ predict it? |
| `/trondheim-3d/` | [Project 2: Trondheim 3D](Project%202/README.md) | GI Systems | Where is the nearest public shelter in Trondheim, and how far is the walk? |
| `/3dgs-viewer/` | [Project 3: 3DGS Viewer](Project%203/README.md) | 3D GIS | What can you learn from a 3D Gaussian splat file without uploading it anywhere? |

Every app links back to the homepage with the same "← My GIS module" link and uses the same favicon.

## The Projects

**Project 1: Projection Lab.** React, TypeScript and d3-geo draw one morphing Mercator/Eckert IV map of 177 Natural Earth countries. Projection-area statistics for every country are precomputed with pyproj and Shapely, stored in PostGIS and served by FastAPI. A distortion-vs-latitude chart compares each country's Mercator inflation with sec²φ. The full stack runs with Docker Compose. On Pages it runs in a **static data mode**, reading JSON exported from the same queries.
[README](Project%201/README.md) · [progress log](Project%201/PROGRESS.md) · [results](Project%201/results/summary.md) · [frontend](Project%201/frontend/README.md) · [backend](Project%201/backend/README.md) · [database](Project%201/database/README.md)

**Project 2: Trondheim 3D.** A CesiumJS and React app with terrain, OSM buildings and DSB public shelters. You click the ground to get the nearest shelter by walking distance along the OSM network.
[README](Project%202/README.md)

**Project 3: 3DGS Viewer.** A static viewer built with Spark and three.js. You open your own 3D Gaussian splat file (PLY, SPZ, .splat, .ksplat, SOG) to see its file facts, fix its up axis and measure a two-point distance. Nothing is uploaded.
[README](Project%203/README.md)

## Build the Website Locally

Node 24 is required. From the repository root:

```powershell
npm run site:install   # npm ci in site/ and the three apps
npm run site:build     # builds everything into dist-site/
npm run site:preview   # serves dist-site/ at http://localhost:4300/TBA4565-Geomatics-Specialization-Course/
```

[scripts/build-site.mjs](scripts/build-site.mjs) builds the homepage and the three apps, then copies them into `dist-site/` under their Pages paths. Project 1 is built with `VITE_DATA_MODE=static`. Project 2 reads its Cesium ion token from `Project 2/.env` (copy `.env.example`). [scripts/preview-site.mjs](scripts/preview-site.mjs) serves the folder under the repository-name prefix, exactly as GitHub Pages does. A stray absolute `/` path therefore returns 404 locally instead of only on the live site. Every app uses a relative Vite `base` (`./`) for the same reason.

To work on a single app, use its own scripts, e.g. `npm --prefix "Project 2" run dev`. Each project README has its run instructions. Project 1's full stack (Docker Compose or native PostGIS + FastAPI) is described in [Run the Map](Project%201/README.md#run-the-map).

## Deployment

[.github/workflows/pages.yml](.github/workflows/pages.yml) runs on pushes to `main` and on manual dispatch. It runs `site:install` and `site:build` and publishes `dist-site/` with [`actions/upload-pages-artifact`](https://github.com/actions/upload-pages-artifact) and [`actions/deploy-pages`](https://github.com/actions/deploy-pages); see GitHub's guide to [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Lint and tests stay in the per-project workflows (`project1-ci.yml`, `project2-ci.yml`, `project3-ci.yml`) and `site-ci.yml` for the homepage.

One-time setup in GitHub and Cesium ion:

- The repository is public. Pages on a free account needs a public repository.
- Settings → Pages → Build and deployment → Source: **GitHub Actions**.
- A Cesium ion token for the public site, separate from the development token, with only the `assets:read` scope and **Allowed URLs** set to `https://progrimm.github.io`. Store it as the repository secret **`CESIUM_ION_TOKEN`** (Settings → Secrets and variables → Actions). Vite embeds it in Project 2's JavaScript, so it is public by design, and the URL restriction is what limits its use ([Cesium ion access tokens](https://cesium.com/learn/ion/cesium-ion-access-tokens/)). The build fails early if the secret is missing.

## Repository Layout

- `site/`: the homepage, a small Vite site without a framework.
- `Project 1/`, `Project 2/`, `Project 3/`: the apps; each builds and tests on its own.
- `scripts/`: the website build and the prefix preview server.
- `report/`: sprint plan and report material.

## Status (2026-10-28)

- **Done and verified locally:** all three projects (see each README); the homepage; the shared home links; Project 1's static data mode; and the one-command build. The assembled site, served under the repository prefix, passed a Playwright round trip (homepage → each project → "← My GIS module" → homepage) at 1600 and 390 px, with 0 console errors and 0 failed requests.
- **Not verified yet:** the first `pages.yml` run and the live URL, the CI workflows on GitHub, and the production Cesium token's URL restriction.
