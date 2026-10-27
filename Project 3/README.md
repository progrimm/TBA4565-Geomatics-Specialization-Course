# 3DGS Viewer

A CesiumJS web app for viewing georeferenced 3D Gaussian splats (3DGS) on a 3D globe. It opens
directly on a Gaussian splat of the Microsoft campus in Redmond (USA), streamed from Cesium ion
as 3D Tiles.

It is a learning project for TBA4565 at NTNU (3D GIS). It was split out of
[Project 2, Trondheim 3D](../Project%202/README.md) on 2026-10-27 and uses the same tooling and
code structure. The planned features are a globe gallery of several georeferenced splats and a
"Viewer lab" that compares 3DGS web viewers. See [Status](#status).

## Features

- Full-page 3D viewer with Cesium World Terrain that opens on the Redmond splat. The splat loads
  at startup, and the camera jumps to the tileset's bounding sphere, so no coordinates are
  hard-coded
- A panel button that flies back to the splat. It shows the loading state and is disabled if the
  splat fails to load
- Loading and error messages. If the splat fails, the rest of the app keeps working
- A collapsible control panel that becomes a bottom sheet on mobile. Camera flights respect
  `prefers-reduced-motion`

## Getting Started

Requirements: Node.js 24 or newer and a free [Cesium ion](https://ion.cesium.com/) account.

1. Create an access token at <https://ion.cesium.com/tokens>.
2. Copy the example environment file and paste the token into it:

   ```powershell
   Copy-Item .env.example .env
   ```

   ```ini
   VITE_CESIUM_TOKEN=your-token-here
   ```

3. Install dependencies and start the dev server:

   ```powershell
   npm ci
   npm run dev
   ```

4. Open the local URL that Vite prints.

If no token is set, the app still starts and shows a warning. Everything then falls back to
Cesium's built-in evaluation token, and Cesium shows a "default token" notice in the credits.

## Scripts

Run these from `Project 3/`.

| Command                | Purpose                             |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the Vite dev server           |
| `npm run build`        | Production build to `dist/`         |
| `npm run preview`      | Serve the production build locally  |
| `npm run lint`         | ESLint, including React hooks rules |
| `npm run format`       | Format all files with Prettier      |
| `npm run format:check` | Check formatting without writing    |
| `npm test`             | Run the Vitest unit tests once      |
| `npm run test:watch`   | Run Vitest in watch mode            |

CI ([`.github/workflows/project3-ci.yml`](../.github/workflows/project3-ci.yml)) runs lint,
format check, tests and build on every push and pull request that touches `Project 3/`.

## Project Structure

```text
src/
  main.jsx        entry point: ion token setup and React root only
  App.jsx         composes hooks and components
  config.js       constants: splat asset ID and tileset settings
  viewer.js       Viewer creation, global scene settings, ion tokens
  layers/         plain-JS Cesium loaders (terrain, splat), no React
  hooks/          React hooks bridging React and Cesium (viewer lifecycle, layer state)
  components/     React UI: panel, splat button, messages
  state/          framework-independent message store
  utils/          pure helpers (camera options, HTML escaping, reduced motion)
tests/            Vitest unit tests
```

Main design choices:

- **Standalone copy, not a shared package.** The message store and the camera, HTML and motion
  helpers are copied from Project 2, so each project builds and deploys on its own. The camera
  and HTML helpers are not used yet. They are kept, with their tests, for the planned
  inspector and gallery features.
- **Plain React, no Resium.** Cesium classes are used directly through refs. Cesium objects are
  created and changed outside React render.
- **The start view comes from the data.** A georeferenced 3D Tiles tileset carries a root
  transform that places it in ECEF (Earth-centred, Earth-fixed) coordinates. Framing the
  tileset's `boundingSphere` with
  [`Camera.flyToBoundingSphere`](https://cesium.com/learn/cesiumjs/ref-doc/Camera.html#flyToBoundingSphere)
  (duration 0) therefore opens on the splat wherever it is on the globe.
- **`requestRenderMode` is on.** The scene only re-renders when something changes.

## Cesium ion Token and Security

- The token is read from `.env` as `VITE_CESIUM_TOKEN`. `.env` is git-ignored, so do not commit
  it.
- Vite embeds `VITE_` variables in the client bundle, so **the token is public in a production
  build**. For deployment, use a separate token with minimal scopes that is restricted to the
  deployed URL in Cesium ion.
- Deliberate exception: the splat asset (ion 4547222) is public but not in the Cesium ion Asset
  Depot, so it cannot be added to our own account. Only that asset is requested with Cesium's
  built-in evaluation token (`CESIUM_EVALUATION_TOKEN` in `src/viewer.js`, captured before our
  token replaces it). It is passed per request through
  [`IonResource.fromAssetId`](https://cesium.com/learn/cesiumjs/ref-doc/IonResource.html#.fromAssetId).
  Cesium then shows a "default token" notice in the credits. A unit test checks that the
  evaluation token survives after our own token is configured.

## Attribution and Licences

On-screen credits come from Cesium's credit display, which is kept enabled on purpose.

| Data                                                   | Source                  | Licence / terms                                                           |
| ------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------- |
| Cesium World Terrain (ion 1), default imagery          | Cesium ion              | [Cesium ion Terms of Service](https://cesium.com/legal/terms-of-service/) |
| Gaussian splat, Microsoft Redmond campus (ion 4547222) | Public Cesium ion asset | Cesium ion terms; credits shown in the viewer                             |

CesiumJS is licensed under Apache 2.0.

## Verification

On 2026-10-27, after the split:

- `npm run lint`, `npm run format:check`, `npm test` (5 files, 9 tests) and `npm run build` pass.
- Browser check with Playwright (headless Chromium) against `npm run preview`, at 1600 × 900 and
  390 × 844. The app opens on the Redmond splat, framed in view, with no console errors. The
  splat button is enabled. On mobile the panel starts collapsed as a bottom sheet.
- Not verified: the check ran without a `.env` (no own token), so everything used the evaluation
  token and the "No Cesium ion token configured" warning was shown. Loading with your own token
  has not been checked yet.

## Status

Split from Project 2, features pending. The app shows a single splat and a fly-to button.

Next: the georeferenced splat gallery (inspector, measurement, alignment check, splat vs mesh,
performance panel), then the Viewer lab. See `report/SPRINT.md`, sessions 6–8.
