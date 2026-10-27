# Trondheim 3D

A CesiumJS web app for exploring Trondheim, Norway, in 3D: global terrain, OpenStreetMap
buildings and DSB public shelters (tilfluktsrom) with click-to-inspect attributes.

It is a learning project for TBA4565 at NTNU. The scope is deliberately small and the focus is
on code quality: linting, tests, error handling and CI.

## Features

- Full-page 3D viewer starting over Midtbyen, with Cesium World Terrain
- Cesium OSM Buildings (3D Tiles), toggleable
- DSB public shelters in Trondheim as ground-clamped points. Click one to see its shelter
  number, capacity and address
- Preset camera views: Midtbyen (Torvet), Nidarosdomen (west front) and Bakklandet (the wharf
  row by Gamle Bybro). Each view centres its landmark on screen (see
  [Camera views](#camera-views))
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
  roughly NN2000 height + 40 m. The camera target heights in `config.js` follow this convention.
- The shelter source data is in EUREF89 / UTM zone 32N (EPSG:25832). It is converted to WGS84
  with proj4 at data-prep time, treating EUREF89 as equal to WGS84 (the difference is under a
  metre).

### Camera views

Each preset in `config.js` stores a **target** (the landmark) plus a heading, pitch and range.
`utils/camera.js` places the camera `range` metres from the target, opposite the viewing
direction. It builds the offset in the target's local East-North-Up frame and converts it to
ECEF with
[`Transforms.eastNorthUpToFixedFrame`](https://cesium.com/learn/cesiumjs/ref-doc/Transforms.html#.eastNorthUpToFixedFrame).
The landmark is then in the centre of the screen by construction. The old presets stored a camera
position and were estimated by eye.

| View         | Target (OpenStreetMap, via Nominatim)                      | Ground, NN2000 (Kartverket DTM 1 m) | Target height, ellipsoidal | Heading / pitch / range |
| ------------ | ---------------------------------------------------------- | ----------------------------------- | -------------------------- | ----------------------- |
| Midtbyen     | Torvet, relation 4681742: 63.4303661 N, 10.3953233 E       | 9.6 m                               | 50 m (ground + 40)         | 0° / −45° / 2000 m      |
| Nidarosdomen | Nidarosdomen, way 417245741: 63.4269308 N, 10.3969145 E    | 13.8 m                              | 74 m (ground + 20 m + 40)  | 90° / −15° / 350 m      |
| Bakklandet   | Nedre Bakklandet, way 22652739: 63.4288329 N, 10.4032895 E | 2.7 m                               | 51 m (ground + 8 m + 40)   | 110° / −20° / 400 m     |

Coordinates come from the [Nominatim](https://nominatim.openstreetmap.org/) search API
(© OpenStreetMap contributors, ODbL). Ground heights come from Kartverket's height API
(`ws.geonorge.no/hoydedata/v1/punkt`, `dtm1` source, CC BY 4.0). Both were looked up on
2026-10-27. The +40 m geoid offset is the approximation described above, not a geoid-model
value.

Checked with Playwright screenshots (a crosshair overlay marks the screen centre) at 1600 × 900
and 390 × 844. Torvet, the cathedral's west front and the Bakklandet wharf row sit under the
crosshair. An earlier Bakklandet target, Gamle Bybro looking south-east, was replaced because
it centred the bridge and left the Bakklandet wharves small at the edge. The Midtbyen view was
also fixed: the old camera stood above Torvet looking north, so the start view showed the
harbour instead of the city centre.

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

## Attribution and Licences

On-screen credits come from Cesium's credit display and the shelter layer's credit. The InfoBox
and credits are kept enabled on purpose.

| Data                                          | Source                                                  | Licence / terms                                                           |
| --------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Cesium World Terrain (ion 1), default imagery | Cesium ion                                              | [Cesium ion Terms of Service](https://cesium.com/legal/terms-of-service/) |
| Cesium OSM Buildings (ion 96188)              | © OpenStreetMap contributors                            | [ODbL](https://opendatacommons.org/licenses/odbl/)                        |
| Tilfluktsrom – Offentlige (public shelters)   | © DSB (Direktoratet for samfunnssikkerhet og beredskap) | [NLOD 2.0](https://data.norge.no/nlod/en/2.0)                             |

CesiumJS is licensed under Apache 2.0.

## Status

Done: terrain and start view, OSM buildings, DSB shelters with InfoBox, control panel with layer
toggles and camera presets, and React refactor. The 3D Gaussian splat showcase that used to live
here was moved to its own app, [Project 3](../Project%203/README.md), on 2026-10-27. After
that split, lint, format check, tests (6 files, 14 tests) and build pass. A Playwright check
of the production build at 1600 px and 390 px showed terrain, buildings and the panel without
the splat button and with no console errors. That check used Cesium's evaluation token, not a
personal token.

Camera views (2026-10-27): all three presets now target real landmark coordinates and were
checked by screenshot (see [Camera views](#camera-views)). Lint, format check, tests (6 files,
19 tests) and build pass. As in the split check, the screenshots used Cesium's evaluation token.

Remaining: public deployment.
