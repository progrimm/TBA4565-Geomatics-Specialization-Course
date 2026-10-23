# Trondheim 3D

A CesiumJS web app for exploring Trondheim, Norway, in 3D: global terrain, OpenStreetMap
buildings and DSB public shelters (tilfluktsrom) with click-to-inspect attributes. A separate
showcase view loads a georeferenced 3D Gaussian splat tileset.

It is a learning project for TBA4565 at NTNU. The scope is deliberately small and the focus is
on code quality: linting, tests, error handling and CI.

## Features

- Full-page 3D viewer starting over Midtbyen, with Cesium World Terrain
- Cesium OSM Buildings (3D Tiles), toggleable
- DSB public shelters in Trondheim as ground-clamped points. Click one to see its shelter
  number, capacity and address
- Preset camera views: Midtbyen, Nidarosdomen and Bakklandet
- 3DGS showcase: a Gaussian splat of the Microsoft Redmond campus (USA), loaded on first click,
  after which the camera flies there
- Loading and error messages for every layer. If one layer fails, the rest of the app keeps
  working
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

If no token is set, the app still starts, but it shows an error and terrain and 3D layers do not
load.

## Scripts

Run these from `Project 2/`.

| Command                 | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server                               |
| `npm run build`         | Production build to `dist/`                             |
| `npm run preview`       | Serve the production build locally                      |
| `npm run lint`          | ESLint, including React hooks rules                     |
| `npm run format`        | Format all files with Prettier                          |
| `npm run format:check`  | Check formatting without writing                        |
| `npm test`              | Run the Vitest unit tests once                          |
| `npm run test:watch`    | Run Vitest in watch mode                                |
| `npm run data:shelters` | Re-download the shelter dataset (see [Data](#shelters)) |

CI ([`.github/workflows/project2-ci.yml`](../.github/workflows/project2-ci.yml)) runs lint,
format check, tests and build on every push and pull request that touches `Project 2/`.

## Project Structure

```text
src/
  main.jsx        entry point: ion token setup and React root only
  App.jsx         composes hooks and components
  config.js       constants: camera views, asset IDs, data URLs, tileset settings
  viewer.js       Viewer creation and global scene settings
  layers/         plain-JS Cesium loaders, one per layer (no React)
  hooks/          React hooks bridging React and Cesium (viewer lifecycle, layer state)
  components/     React UI: panel, view buttons, layer toggles, messages
  state/          framework-independent message store
  utils/          pure helpers (CRS conversion, camera options, HTML escaping)
scripts/          Node data-prep scripts
tests/            Vitest unit tests and fixtures
public/data/      small static datasets (GeoJSON)
```

Main design choices:

- **Plain React, no Resium.** Cesium classes are used directly through refs, so the Cesium API
  stays visible. Cesium objects are created and changed outside React render. Components call
  the modules in `layers/` and `viewer.js`.
- **`requestRenderMode` is on.** The scene only re-renders when something changes, so code that
  changes the scene (for example toggling a layer) calls `scene.requestRender()`.
- **Every async load handles failure.** Each loader returns `undefined` on error and posts a
  user-facing message through `state/messages.js`.

## Data

### Coordinate reference systems

- The app works in WGS84. Longitude and latitude are in degrees and **heights are ellipsoidal**,
  not NN2000. In Trondheim the geoid is about 40 m above the ellipsoid, so ellipsoidal height is
  roughly NN2000 height + 40 m. The camera heights in `config.js` follow this convention.
- The shelter source data is in EUREF89 / UTM zone 32N (EPSG:25832). It is converted to WGS84
  with proj4 at data-prep time, treating EUREF89 as equal to WGS84 (the difference is under a
  metre).

### Shelters

`public/data/shelters.geojson` is committed. To regenerate it from DSB's WFS service:

```powershell
npm run data:shelters
```

The script requests `layer_340` (Tilfluktsrom – Offentlige) within a bounding box around
Trondheim in EPSG:25832, converts the points to WGS84 GeoJSON and keeps the shelter number,
capacity and address. It refuses to overwrite the file if the service returns no features.

## Cesium ion Token and Security

- The token is read from `.env` as `VITE_CESIUM_TOKEN`. `.env` is git-ignored, so do not commit
  it.
- Vite embeds `VITE_` variables in the client bundle, so **the token is public in a production
  build**. For deployment, use a separate token with minimal scopes that is restricted to the
  deployed URL in Cesium ion.
- Deliberate exception: the splat asset (ion 4547222) is public but not in the Cesium ion Asset
  Depot. Only that asset is requested with Cesium's built-in evaluation token. Cesium then shows
  a "default token" notice in the credits.

## Attribution and Licences

On-screen credits come from Cesium's credit display and the shelter layer's credit. The InfoBox
and credits are kept enabled on purpose.

| Data                                                   | Source                                                  | Licence / terms                                                           |
| ------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Cesium World Terrain (ion 1), default imagery          | Cesium ion                                              | [Cesium ion Terms of Service](https://cesium.com/legal/terms-of-service/) |
| Cesium OSM Buildings (ion 96188)                       | © OpenStreetMap contributors                            | [ODbL](https://opendatacommons.org/licenses/odbl/)                        |
| Tilfluktsrom – Offentlige (public shelters)            | © DSB (Direktoratet for samfunnssikkerhet og beredskap) | [NLOD 2.0](https://data.norge.no/nlod/en/2.0)                             |
| Gaussian splat, Microsoft Redmond campus (ion 4547222) | Public Cesium ion asset                                 | Cesium ion terms; credits shown in the viewer                             |

CesiumJS is licensed under Apache 2.0.

## Status

Done: terrain and start view, OSM buildings, DSB shelters with InfoBox, control panel with layer
toggles and camera presets, React refactor, and the 3DGS showcase.

Remaining: public deployment. The Nidarosdomen and Bakklandet camera positions are estimates
and may need tuning.
