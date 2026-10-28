# 3DGS Viewer

A CesiumJS web app for viewing georeferenced 3D Gaussian splats (3DGS) on a 3D globe. It opens
on a globe with a marker for each of four public splats in the USA and France. Each one streams
as 3D Tiles and can be inspected, measured and checked against independent geodata.

It is a learning project for TBA4565 at NTNU (3D GIS). It was split out of
[Project 2, Trondheim 3D](../Project%202/README.md) on 2026-10-27 and uses the same tooling and
code structure. A [Viewer lab](#viewer-lab) shows one test splat in Spark, PlayCanvas and
Babylon.js (benchmarked) and the ArcGIS Maps SDK (qualitative), each on its own page.

## Features

- **Globe gallery.** The app opens on the whole globe with one marker per splat. Picking a
  marker or a panel entry loads that splat (lazily, the first time) and flies to its bounding
  sphere. The panel shows place, capture source, data type and credits. Only the selected
  splat is shown.
- **Georeferencing inspector.** Decodes the tileset's root transform into the origin's
  longitude, latitude and ellipsoidal height, the local axes relative to East-North-Up (ENU),
  the scale and the bounding sphere. It also explains the coordinate chain (see
  [Georeferencing](#georeferencing)).
- **Measurement tool.** Click two points to get the straight 3D distance, the horizontal
  geodesic distance
  ([`EllipsoidGeodesic`](https://cesium.com/learn/cesiumjs/ref-doc/EllipsoidGeodesic.html)) and
  the ellipsoidal height difference. The UI says that splats cannot be picked (see
  [Findings](#findings-about-cesiumjs-11460)).
- **Alignment check.** Switches for Cesium World Terrain (versus the bare ellipsoid), imagery,
  Cesium OSM Buildings and the splat itself. The dam has a switch for the offset that Cesium's
  Sandcastle example applies. A swipe compares the splat (left) with the reference layers or,
  for the substation, with a triangle mesh of the same scene (right), through
  [`Scene.splitPosition`](https://cesium.com/learn/cesiumjs/ref-doc/Scene.html#splitPosition)
  and `splitDirection`.
- **Performance panel.** Frame rate and worst frame, tileset memory, JS heap, tiles in memory,
  and the time to `tileset.json` and to the first view
  ([`initialTilesLoaded`](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html#initialTilesLoaded)).
  While the panel is open, rendering is continuous.
- **Viewer lab** (`lab/`). The same CC BY splat in three general-purpose 3DGS viewers, plus
  an ArcGIS page with Esri's sample layer, a Playwright benchmark and a comparison table. See
  [Viewer lab](#viewer-lab).
- Loading and error messages per splat. If one splat fails, the rest keeps working. The
  collapsible panel becomes a bottom sheet on mobile. Camera flights respect
  `prefers-reduced-motion`.

## The splats

Each splat was located by decoding the root transform of its `tileset.json` on 2026-10-27, and
identified with OpenStreetMap: Nominatim reverse geocoding plus named OSM features at the
origin. All four load in CesiumJS 1.146.0.

| Splat                        | Place                                  | Source                                       | Capture                                                                                                                                                        |
| ---------------------------- | -------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Microsoft campus             | Redmond, Washington, USA               | Cesium ion 4547222                           | Bentley Systems with Cesium: 20,169 photos, ~3.7 km², 3 cm GSD, 110 million splats ([Cesium blog](https://cesium.com/blog/2026/04/27/3d-gaussian-splats-lod/)) |
| Hines Rowing Center          | Whitemarsh Township, Pennsylvania, USA | Cesium ion 3667783 ("Boathouse")             | Not stated                                                                                                                                                     |
| RTE substation (splat, mesh) | Boulieu-lès-Annonay, Ardèche, France   | Cesium ion 3667784 (splat), 3443919 (mesh)   | Not stated. OSM: "Poste Source Haute Tension Boulieu Les Annonay", operator RTE                                                                                |
| O'Shaughnessy Dam            | Dublin, Ohio, USA (Scioto River)       | Bentley iTwin reality data "GSI_DAM_3Dtiles" | Not stated                                                                                                                                                     |

The ion assets come from Cesium's Sandcastle examples "3D Tiles Gaussian Splats with LOD",
"3D Tiles Gaussian Splatting" and "3D Tiles Gaussian Splatting Comparison". The dam comes from
"iTwin Gaussian Splats", which loads it with
[`ITwinData.createTilesetForRealityDataId`](https://cesium.com/learn/cesiumjs/ref-doc/ITwinData.html#.createTilesetForRealityDataId)
and a public **iTwin share key that expires on 2026-12-01 05:13 UTC** (the JWT `exp` claim,
checked by a unit test). After that date the dam will fail to load, and the app will show an
error for that splat only. The dam's `tileset.json` declares `KHR_gaussian_splatting` and
`KHR_gaussian_splatting_compression_spz_2`.

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

Measurement scripts (Playwright, run headless on a real GPU):

| Command                                                                                           | Purpose                                                                 |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `node scripts/alignment-check.mjs shots <splat> <lon> <lat> <m>`                                  | Nadir screenshots with and without the splat (needs `npm run dev`)      |
| `node scripts/alignment-check.mjs pick <splat> <lon> <lat> <m> <name> sx sy rx ry`                | Horizontal offset between two picked pixels, appended to `offsets.csv`  |
| `uv run --with numpy --with pillow python scripts/alignment-register.py results/alignment/<name>` | Image registration of a screenshot pair                                 |
| `node scripts/gallery-performance.mjs [runs]`                                                     | Performance of each splat (needs `npm run build` and `npm run preview`) |
| `node scripts/viewer-benchmark.mjs [runs]`                                                        | Viewer lab benchmark, headed (needs `npm run build`; serves `dist/`)    |
| `node scripts/lab-static-metrics.mjs`                                                             | Viewer lab bundle sizes and integration lines (needs `npm run build`)   |

The dev server exposes `window.cesiumViewer` for the alignment script. Production builds do
not (`import.meta.env.DEV`).

CI ([`.github/workflows/project3-ci.yml`](../.github/workflows/project3-ci.yml)) runs lint,
format check, tests and build on every push and pull request that touches `Project 3/`.

## Project Structure

```text
src/
  main.jsx        entry point: ion token and iTwin share key setup, React root
  App.jsx         composes hooks and components
  config.js       constants: gallery splats, globe view, tileset settings
  viewer.js       Viewer creation, render mode, ion tokens, iTwin share key
  layers/         plain-JS Cesium code: terrain, splat/mesh loading, markers,
                  measurement drawing, reference layers, load statistics
  hooks/          React hooks bridging React and Cesium (viewer, gallery,
                  measurement, alignment, performance)
  components/     React UI: panel, gallery, inspector, tools, swipe line, messages
  state/          framework-independent message store
  utils/          pure helpers: georeferencing, measurement, formatting, frame
                  statistics, camera options, HTML escaping, reduced motion
  lab/            Viewer lab: shared config and harness, one module per viewer
                  (spark, playcanvas, babylon, arcgis), the lab index and its tables
lab/              one HTML entry per Viewer lab page (Vite multi-page build)
public/splats/    the Viewer lab test splat and its attribution
tests/            Vitest unit tests
scripts/          Playwright measurement scripts and the registration script
results/          measured results (alignment screenshots and offsets, performance CSV)
```

Main design choices:

- **Standalone copy, not a shared package.** The message store and the camera, HTML, motion
  and visibility helpers are copied from Project 2, so each project builds and deploys on its
  own.
- **Plain React, no Resium.** Cesium classes are used directly. Cesium objects are created and
  changed in `layers/` and `viewer.js`, outside React render. Hooks only hold UI state.
- **Lazy loading, one visible splat.** Splats load on first selection. Hidden tilesets
  (`show = false`) neither render nor request tiles, so a big splat does not slow down the
  others.
- **The view comes from the data.** Each splat is framed by its own `boundingSphere` with
  [`Camera.flyToBoundingSphere`](https://cesium.com/learn/cesiumjs/ref-doc/Camera.html#flyToBoundingSphere).
  The marker coordinates in `config.js` are used only before a tileset is loaded.
- **One page per lab viewer.** Each viewer is its own Vite entry (`build.rollupOptions.input`),
  so it has its own WebGL context and bundle, and its bundle can be measured. The lab pages are
  plain JavaScript without React, so a shared framework does not add the same weight to every
  row.
- **`requestRenderMode` is on.** The scene only re-renders when something changes. Splats need
  a workaround, described under Findings.

## Background: 3D Gaussian splatting

**What it is.** 3D Gaussian splatting (Kerbl et al., 2023) represents a scene as millions of
small, semi-transparent 3D Gaussians. Each one has a position (its mean), a shape and size (a
covariance, stored as a scale per axis plus a rotation quaternion), an opacity, and a colour
stored as spherical-harmonic coefficients, so the colour can change with the viewing direction.
The Gaussians are optimised from photos whose camera poses come from structure from motion
(e.g. COLMAP), starting from its sparse point cloud. To render a view, each Gaussian is
projected to a 2D ellipse ("splat"). The splats are sorted by depth and alpha-blended, which is
fast enough for real time on a GPU. Because the sort depends on the camera, every viewer re-sorts
while the camera moves; CesiumJS does this in a web worker (see Findings).

**Splats vs meshes and point clouds.** A mesh is an explicit surface: vertices joined by
triangles, with a texture. It has topology and a closed surface, so it can be picked, clipped
and measured, but thin structures and reflections are hard to reconstruct. A point cloud
contains samples on the surface, each with a position and usually a colour, but with no size
or orientation. A Gaussian has an extent, an orientation and an opacity. It is fitted to
reproduce the photos (a photometric loss), not to sit on the surface, so it gives a
photorealistic image without guaranteeing that any one Gaussian marks a surface point. The
[substation comparison](#splat-vs-mesh) shows the trade-off: the splat renders lattice towers
and wires that the mesh loses, but has "floaters" and, in CesiumJS, cannot be picked.

**File formats.**

- **PLY**: the output of the reference implementation. One binary record per splat: `x y z`,
  `rot_0..3`, `scale_0..2` (log scale), `opacity` (logit), `f_dc_0..2` (SH degree 0) and
  `f_rest_0..44` (SH degrees 1 to 3). The lab's test splat has exactly these 59 floats per
  splat: 236 bytes × 200,258 splats plus a 1,477-byte header = 47,262,365 bytes. Simple and
  universal, but large.
- **SPZ**: Niantic's open compressed format ([nianticlabs/spz](https://github.com/nianticlabs/spz)),
  which quantises the attributes and gzips them. The same splat is 4.96 MB as SPZ, about 9.5
  times smaller (see [Test splat](#test-splat)).
- **SOG**: PlayCanvas's compressed format, which stores the attributes in images
  ([PlayCanvas formats](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/));
  4.81 MB for the test splat.
- **ksplat**: the format of Mark Kellogg's Three.js viewer
  ([GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D)), with optional
  compression levels. Spark can read it; none of the pages here use it.

**How CesiumJS streams splats.** CesiumJS reads splats as 3D Tiles: a `tileset.json` holds a
tree of tiles, each with a bounding volume and a geometric error, and CesiumJS loads only the
tiles whose screen-space error is too large for the current view. Each tile's content is a
glTF 2.0 (glb). The glTF extension
[`KHR_gaussian_splatting`](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_gaussian_splatting)
stores splats as a `POINTS` primitive with `POSITION` plus `KHR_gaussian_splatting:ROTATION`,
`:SCALE`, `:OPACITY` and `:SH_DEGREE_n_COEF_m` attributes. Unlike PLY, scale and opacity are
stored as linear values. Khronos lists it as "Complete, Ratified by the Khronos Group" (checked
2026-10-28). The compression extension, `KHR_gaussian_splatting_compression_spz_2`, puts an
SPZ payload inside the glTF. It is still an open draft
([KhronosGroup/glTF#2531](https://github.com/KhronosGroup/glTF/pull/2531), checked
2026-10-28). Note the `_2`: the sprint plan named it `..._spz`, but CesiumJS uses `_spz_2`. In the
installed **CesiumJS 1.146.0**, `Cesium3DTileContentFactory` uses the splat renderer
(`GaussianSplat3DTileContent`) only when the tileset's `extensionsRequired` lists **both**
`KHR_gaussian_splatting` and `KHR_gaussian_splatting_compression_spz_2`. So in this version,
splat tiles must be SPZ-compressed. The older draft `KHR_spz_gaussian_splats_compression` was
removed in 1.135, and now only triggers a deprecation warning asking for the tileset to be
re-tiled (`GaussianSplat3DTileContent.js`, `CHANGES.md`). 3D Tiles gives splats what the
general-purpose viewers lack: hierarchical LOD (the 110-million-splat Microsoft campus streams
39 tiles for its first view, see [Performance](#performance)) and a root transform that puts
the splat on the globe.

**Why georeferencing matters.** A splat trained from photos lives in the arbitrary frame of the
structure-from-motion solution: unknown origin, orientation and often scale (the lab's test
splat even has +y pointing down). Only when it is tied to a CRS, through GNSS camera positions
or ground control points and then a root transform, can it be overlaid on terrain, imagery and
buildings, measured in metres with geodetic distances, and combined with other geodata. It also
makes errors visible: the [alignment check](#alignment-check) found the Hines Rowing Center
splat 4.9 m south of the imagery, and the dam 12 m too high, a size of error typical of mixing
ellipsoidal and orthometric heights.

Reference: B. Kerbl, G. Kopanas, T. Leimkühler and G. Drettakis, "3D Gaussian Splatting for
Real-Time Radiance Field Rendering", _ACM Transactions on Graphics_ 42(4), July 2023
([project page](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)).

## Georeferencing

A 3D Tiles tileset stores splat positions in local metres (glTF). The root tile's `transform`
is a 4×4 matrix (rotation and translation) that maps them into ECEF (EPSG:4978, metres from
the Earth's centre). On the WGS 84 ellipsoid, ECEF converts to geographic longitude, latitude
and ellipsoidal height (EPSG:4979). `src/utils/georef.js` decodes the transform. Its tests
build ENU frames at known places and check that the origin, a rotation about Up and a scale
come back out.

Decoded on 2026-10-27, through the inspector in the running app:

| Splat             | Origin lat, lon (°)    | Origin h (m, ellipsoidal) | Axes vs ENU             | Scale | Bounding sphere r (m) | Centre h (m) |
| ----------------- | ---------------------- | ------------------------- | ----------------------- | ----- | --------------------- | ------------ |
| Microsoft campus  | 47.647850, −122.131900 | 5.00                      | 0.00° about Up, tilt 0° | 1     | 1645                  | 109.22       |
| Hines Rowing      | 40.072320, −75.291630  | 0.00                      | 0.00°, tilt 0°          | 1     | 147.54                | 6.44         |
| RTE substation    | 45.265188, 4.668731    | 444.36                    | 0.00°, tilt 0°          | 1     | 58.53                 | 463.42       |
| O'Shaughnessy Dam | 40.154100, −83.125310  | 0.00                      | 0.00°, tilt 0°          | 1     | 42.64                 | 235.49       |

Every root transform is a plain East-North-Up frame with scale 1. The local x, y and z axes are
east, north and up. Three origins sit on the ellipsoid itself (h = 0 or 5 m), and the
geometry's real height is in the local z coordinates. Cesium's
[`Transforms.eastNorthUpToFixedFrame`](https://cesium.com/learn/cesiumjs/ref-doc/Transforms.html#.eastNorthUpToFixedFrame)
builds exactly this kind of frame.

**The dam's Sandcastle offset.** Cesium's example shifts the dam by (−1, 9, −8) m. Because
the shift goes through `modelMatrix`, these are ECEF components, not ENU. The inspector
converts the shift to ENU at the dam: **E +0.08 m, N −0.28 m, U −12.08 m**. So it is a 12.1 m
vertical correction that lowers the splat onto Cesium World Terrain, not the "−8 m" its
comment suggests. Cesium World Terrain heights are ellipsoidal, and the geoid in Ohio lies
roughly 30 m below the ellipsoid. An error of this size is typical when orthometric and
ellipsoidal heights are mixed up, but the data does not prove that this is the cause.

## Alignment check

Method (`scripts/alignment-check.mjs` and `scripts/alignment-register.py`, run on 2026-10-27):

1. A straight-down (nadir) camera above each splat, heading north. Two screenshots from the
   same camera: one with the splat and one without (terrain plus imagery only).
2. Image registration: inside the splat's footprint (the pixels where the two screenshots
   differ), the normalised cross-correlation (NCC) of the two gradient images is maximised over
   pixel shifts of up to ±80 px. Gradients are compared rather than colours, because the
   imagery and the splat were captured at different times. The sign convention was checked on
   a synthetically shifted image, which was recovered exactly (5, 3) px.
3. The best shift is converted to metres by picking the terrain under both pixels
   (`Scene.pickPosition` with the splat hidden), and expressed in ENU. The ground resolution
   comes from picking two pixels 100 px apart.

| Splat                                | Camera above ground | Resolution | Best shift (px) | NCC best / at 0 | Splat vs imagery (E, N) | Horizontal |
| ------------------------------------ | ------------------- | ---------- | --------------- | --------------- | ----------------------- | ---------- |
| RTE substation                       | 120 m               | 0.087 m/px | (+1, 0)         | 0.201 / 0.199   | +0.09 m, 0.00 m         | 0.09 m     |
| Microsoft campus                     | 300 m               | 0.216 m/px | (0, 0)          | 0.124 / 0.124   | below one pixel         | < 0.22 m   |
| Hines Rowing Center                  | 250 m               | 0.181 m/px | (−4, +27)       | 0.088 / 0.046   | −0.72 m, **−4.87 m**    | **4.93 m** |
| O'Shaughnessy Dam, without offset    | 185 m               | 0.134 m/px | (−7, −8)        | 0.192 / 0.129   | −0.93 m, +1.06 m        | 1.41 m     |
| O'Shaughnessy Dam, Sandcastle offset | 185 m               | 0.134 m/px | (0, −1)         | 0.214 / 0.201   | 0.00 m, +0.13 m         | 0.13 m     |

Screenshots and `offsets.csv` are in `results/alignment/`. Interpretation:

- The substation, the Microsoft campus and the dam (with its offset) match the imagery within
  about one pixel (0.1 to 0.2 m) horizontally.
- The Hines Rowing Center splat lies about **4.9 m south** of the imagery. The shift is visible
  in the screenshots: the large building's north edge and the road are both displaced.
- Without its offset, the dam sits 12 m too high. From straight above, the splat then looks
  magnified, and the registration turns this scale error into an apparent 1.4 m shift. The
  1.41 m is therefore a symptom of the vertical error, not a horizontal offset.
- Limits: the reference is Cesium's default imagery, which has its own unknown error, so these
  are relative offsets, not absolute accuracy. One window per splat was registered, not 3–5
  separate features as first planned. Elevated objects shift differently in the two images
  (relief displacement). The registration is limited to whole pixels. Heights were not
  measured, except through the dam's offset, because splats cannot be picked (below).

## Splat vs mesh

The substation swipe compares Gaussian splats (left) with a photogrammetry triangle mesh of the
same scene (right). In the screenshot at the default view, the splat shows the thin structures
more completely and more sharply: the lattice towers, the busbar frames and the overhead
lines. In the mesh they are partly missing or blurred into the surface. The mesh has hard
edges and a closed surface, but its textures are softer. The splat shows blurry "floaters" at
its edges, where few photos covered the scene. These differences come from looking at the
screenshots, not from a measurement.

## Findings about CesiumJS 1.146.0

Found while building this, and checked in the CesiumJS source in `node_modules/@cesium/engine`:

- **Splats cannot be picked.** `GaussianSplatPrimitive` renders with `depthMask = false` and
  returns early in the pick pass. `Scene.pickPosition` therefore returns the terrain, buildings
  or mesh behind a splat. Seen from straight above, that still gives a feature's horizontal
  position. Heights on a splat cannot be measured in CesiumJS.
- **No opacity or style.** Splats have no `Cesium3DTileStyle` support and no opacity uniform
  in 1.146. A swipe and a visibility switch take the place of the planned opacity slider.
- **`requestRenderMode` and splat sorting.** The splats are sorted by depth in a web worker.
  When the sort finishes, nothing requests a new frame, so with `requestRenderMode` the dam
  stayed invisible until the camera moved. The same happened after a `modelMatrix` change.
  `layers/splat.js` keeps requesting frames for 3 s after every tile load, camera stop and
  offset change.
- **`totalMemoryUsageInBytes` undercounts splats.** A splat tile adds its share of the shared
  splat texture when it loads. If that texture does not exist yet, the share is 0, so the
  memory can read 0 B even with tiles loaded.

## Performance

Measured with `scripts/gallery-performance.mjs` on 2026-10-27: headless Chromium 156 on Windows 11,
AMD Radeon 780M (integrated GPU, ANGLE/D3D11), 1600 × 900 viewport, production build served by
`vite preview`. There were 3 runs per splat, each in a fresh browser context with an empty
cache. The camera was static at the view the app flies to. The frame rate is the median of 10
one-second samples taken with continuous rendering. The table shows medians over the 3 runs;
every run is in `results/gallery-performance.csv`.

| Splat               | Frame rate | Worst frame (max of runs) | tileset.json | First view | Tiles in memory | Tileset memory\* |
| ------------------- | ---------- | ------------------------- | ------------ | ---------- | --------------- | ---------------- |
| Microsoft campus    | 54 fps     | 115 ms                    | 0.75 s       | 2.30 s     | 39              | 52.8 MiB         |
| Hines Rowing Center | 36.5 fps   | 99 ms                     | 0.86 s       | 5.51 s     | 4               | 6.4 MiB          |
| RTE substation      | 36 fps     | 99 ms                     | 0.63 s       | 3.82 s     | 4               | 0 B\*            |
| O'Shaughnessy Dam   | 40 fps     | 101 ms                    | 2.18 s       | 41.6 s     | 1               | 0 B\*            |

\* `totalMemoryUsageInBytes` undercounts splats in 1.146 (see Findings), so this column is not
reliable. The JS heap is in the CSV, but it varied a lot between runs, so it is left out here.

- The 110-million-splat Microsoft campus has the highest frame rate and the fastest first
  view. Hierarchical LOD streams only the 39 tiles that the view needs. The three small,
  single-level splats send all their splats to the GPU.
- The dam is one 11.75 MiB glb tile (SPZ-compressed). It came from Bentley's storage in 38–71 s
  in the browser, while a direct Node download of the same file took 7.8 s once. The first
  view therefore depends on the network, not on rendering.
- Limits: one machine, a static camera, headless Chromium, and the network at the time of the
  runs. Rendering was continuous while the panel was open, including during loading.

## Viewer lab

Research question, second half: what does a geospatial viewer offer over general-purpose splat
viewers? The lab renders one test splat in three popular 3DGS web viewers and adds the ArcGIS
Maps SDK as a geospatial counterpart to the CesiumJS gallery. Open it from the gallery panel or
at `lab/`.

### Test splat

"SOAR Telescope" by Luis Cerda,
[khyron/Gaussian-Splatting](https://github.com/khyron/Gaussian-Splatting) release 1.0,
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). It shows the SOAR telescope on Cerro
Pachón, Chile, with 200,258 splats and spherical harmonics of degree 3. The source file is a
SuperSplat compressed PLY. It was converted to a standard 3DGS PLY with
`npx @playcanvas/splat-transform@3.10.3`, so every viewer loads the same plain format. Details
and checksums are in [`public/splats/ATTRIBUTION.md`](public/splats/ATTRIBUTION.md). The splat
is in local coordinates without georeferencing, so it is not in the globe gallery.

| Format                     | File size (bytes) | Native to                  |
| -------------------------- | ----------------- | -------------------------- |
| Standard PLY (shared file) | 47,262,365        | all three (benchmarked)    |
| Compressed PLY (original)  | 12,273,900        | SuperSplat / PlayCanvas    |
| SPZ                        | 4,962,502         | Niantic; Spark, Babylon    |
| SOG                        | 4,813,751         | PlayCanvas; Spark, Babylon |

The SPZ and SOG sizes come from converting the original with the same splat-transform version
on 2026-10-27. These files are not shipped; only the PLY is benchmarked.

### Viewers and pages

| Page                  | Package (pinned)                                        | Docs                                                                                                               |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `lab/spark.html`      | `@sparkjsdev/spark` 2.4.0 on `three` 0.186.1            | [Spark docs](https://sparkjs.dev/docs/)                                                                            |
| `lab/playcanvas.html` | `playcanvas` 2.23.3 (gsplat component)                  | [PlayCanvas Gaussian splatting](https://developer.playcanvas.com/user-manual/gaussian-splatting/)                  |
| `lab/babylon.html`    | `@babylonjs/core` and `@babylonjs/loaders` 9.32.1       | [Babylon.js Gaussian splatting](https://doc.babylonjs.com/features/featuresDeepDive/mesh/gaussianSplatting)        |
| `lab/arcgis.html`     | `@arcgis/core` 5.1.27 (`GaussianSplatLayer`, since 5.0) | [`GaussianSplatLayer`](https://developers.arcgis.com/javascript/latest/references/core/layers/GaussianSplatLayer/) |

- **Shared harness** (`src/lab/harness.js`, `src/lab/config.js`). Every page gets the same
  "← My GIS module" bar, credits, status line, 1280 × 720 drawing buffer (scaled down by CSS on
  narrow screens), 60° vertical field of view and camera orbit. Each viewer module only creates
  its engine, loads the PLY and applies camera poses.
- **Axis conventions.** The PLY follows the 3DGS/COLMAP convention with +y pointing down. The
  shared camera poses are in the PLY's own coordinates with "up" = −y. Spark (Three.js) uses
  them directly with `camera.up = (0, −1, 0)`. PlayCanvas's orbit controls assume +y up, so the
  splat entity is turned 180° about z (as in PlayCanvas's own examples) and the poses get the
  same turn. Babylon.js keeps its default left-handed scene, and its image matched the others
  only when y was negated in the poses. With `useRightHandedSystem` it was mirrored. These were
  found by comparing screenshots of the start view, which now look the same in all three viewers.
- **ArcGIS page.** It loads Esri's public sample layer (portal item
  `01596d71a5ce40ec8a6f21baad6e5b6f`, "Portcoast industrial", owner `jsapi_team`, credit
  "Portcoast Consultant Corporation", no licence stated on the item) in a `SceneView` with the
  `satellite` basemap and world elevation. It worked without an API key (no console errors). The
  SDK's own assets come from Esri's CDN (`js.arcgis.com`). It cannot load our PLY (the layer
  takes a scene service or portal item), so it is compared qualitatively only.
- **CesiumJS** is not a lab page. It would need the splat as 3D Tiles, i.e. uploading the PLY to
  Cesium ion and tiling it there, which was left out on purpose. The gallery's
  [performance numbers](#performance) are for other splats and are not comparable.

### Benchmark method

`scripts/viewer-benchmark.mjs` runs Playwright Chromium **headed** on the real GPU. It serves
`dist/` from its own static server without compression: `vite preview` gzips responses on the
fly, which made the 47 MB PLY take 2.7–3.4 s instead of 0.13–0.2 s on localhost (measured with a
browser `fetch` and with curl). Each viewer runs 3 times per resolution, each in a fresh browser
context with an empty cache, at 1280 × 720 and at 2560 × 1440 (four times the pixels,
`?scale=2`). The page runs in `?bench` mode:

- **First frame**: from navigation start to the second animation frame after the engine says
  the splat is loaded (Spark: `SplatMesh.initialized`; PlayCanvas: the asset's `load` event;
  Babylon: `ImportMeshAsync`). It includes download, parsing and GPU upload.
- **Mean and 5th-percentile FPS**: after 2 s of settling, the harness moves the camera once
  around the splat in 10 s (one pose per animation frame) and records every frame's timestamp.
  Mean FPS = frames / time; 5th-percentile FPS = 1000 / the 95th-percentile frame time.
- **JS heap**: `Runtime.getHeapUsage` (Chrome DevTools Protocol) after a forced garbage
  collection.
- **Network**: response bytes sent by the static server during the run. They are counted on the
  server because Spark downloads the splat in a Web Worker, which the page's DevTools session
  did not see (a first trial counted only 3.1 MiB for Spark).
- **Bundle size**: `scripts/lab-static-metrics.mjs` gzips (zlib default level) each page's entry
  chunk, its static imports and its CSS, as listed by the Vite manifest. **Integration lines**
  are the non-blank, non-comment lines of each viewer module in `src/lab/`.

Vsync stays on. A trial with `--disable-gpu-vsync --disable-frame-rate-limit` gave impossible
numbers (Spark: 191 fps mean but 2,500 fps 5th percentile), because `requestAnimationFrame` then
fires without new frames being shown, so that mode was dropped.

### Benchmark results

Measured on 2026-10-27: Chromium 156.0.8078.4 (Playwright, headed), AMD Radeon 780M (integrated,
ANGLE/D3D11), AMD Ryzen 7 7840HS, Windows 11 Home 10.0.26200, display at 120 Hz, viewport
1600 × 1000. Medians of 3 runs. Every run is in `results/viewer-benchmark.csv`, the environment
in `results/viewer-benchmark-env.json` and the static metrics in `results/viewer-static.csv`.

| Viewer     | Resolution  | First frame | Mean FPS | 5th-pct FPS | JS heap | Network  | Bundle (gzip) | Integration lines |
| ---------- | ----------- | ----------- | -------- | ----------- | ------- | -------- | ------------- | ----------------- |
| Spark      | 1280 × 720  | 0.49 s      | 120.0    | 114.9       | 6.8 MiB | 48.2 MiB | 1,057 KiB     | 46                |
| PlayCanvas | 1280 × 720  | 0.83 s      | 119.9    | 113.6       | 5.9 MiB | 46.4 MiB | 365 KiB       | 83                |
| Babylon.js | 1280 × 720  | 0.77 s      | 120.0    | 113.6       | 5.9 MiB | 46.8 MiB | 441 KiB       | 38                |
| Spark      | 2560 × 1440 | 0.48 s      | 119.9    | 113.6       | 6.8 MiB | 48.2 MiB | 1,057 KiB     | 46                |
| PlayCanvas | 2560 × 1440 | 0.83 s      | 120.0    | 113.6       | 5.9 MiB | 46.4 MiB | 365 KiB       | 83                |
| Babylon.js | 2560 × 1440 | 0.61 s      | 120.0    | 113.6       | 5.9 MiB | 46.8 MiB | 441 KiB       | 38                |

The ArcGIS page's initial bundle is 1,079 KiB gzipped (511 files in the manifest, before any
lazily loaded chunk or CDN asset) with 27 integration lines. It is not benchmarked.

Integration lines and bundle sizes were re-measured on 2026-10-28, after the keyboard controls
(see [Accessibility](#accessibility)) and the PlayCanvas CSS fix added 1–4 lines per viewer. The benchmark was not run
again: those changes only touch code that `?bench` mode skips (controls are not created). One
fix does affect what was on screen during the runs. PlayCanvas's `setCanvasFillMode` wrote an
inline CSS size equal to the drawing buffer, so at 2560 × 1440 the PlayCanvas page showed only
the top-left quarter of its image in the 1280 × 720 stage. The GPU still rendered the full
2560 × 1440 buffer, so the frame-rate load matches the other viewers, but those PlayCanvas runs
were not repeated after the fix.

What the numbers say:

- **Frame rate does not separate the viewers here.** All three held the 120 Hz display rate
  during the orbit at both resolutions. A 5th percentile of 113.6 fps is an 8.8 ms frame, i.e.
  ordinary vsync jitter. A 200,000-splat scene is not a stress test for this GPU; a larger splat
  or a weaker device would be needed to rank the renderers.
- **Time to first frame** is under 1 s for all three on localhost. Spark was fastest (0.48–0.49 s
  median), then Babylon.js and PlayCanvas. One Spark run (the very first run) took 0.88 s. Each
  engine reports "loaded" at a slightly different stage, so differences of a few hundred
  milliseconds are not a strong result.
- **Network** is dominated by the 45.1 MiB PLY in every case. The rest is the page's own code,
  served uncompressed by the benchmark server, which is why Spark (largest bundle) is highest.
- **JS heap** is only 6–7 MiB. The splat data lives in ArrayBuffers, workers and GPU memory,
  which `Runtime.getHeapUsage` does not count, so this column says little about real memory use.
- **Bundle size** differs most: Spark with Three.js is about 2.9 times PlayCanvas's.

### Qualitative comparison

| Viewer                     | Licence                                     | Engine                      | Formats                                                                | LOD and streaming                                                 | Georeferencing and CRS                               | GIS features                                                        |
| -------------------------- | ------------------------------------------- | --------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Spark 2.4.0                | MIT                                         | Three.js (WebGL2)           | PLY (incl. compressed), SPZ, SOG, SPLAT, KSPLAT, RAD                   | Optional (`lod: true`, built in a worker); paged `.rad` streaming | None: local coordinates                              | None built in                                                       |
| PlayCanvas 2.23.3          | MIT                                         | PlayCanvas (WebGL2/WebGPU)  | PLY (incl. compressed), SOG, streamed SOG, GLB, SPZ                    | Streamed SOG: chunked spatial tree with LOD levels                | None: local coordinates                              | None built in                                                       |
| Babylon.js 9.32.1          | Apache 2.0                                  | Babylon.js (WebGL2/WebGPU)  | PLY (incl. compressed), SPLAT, SPZ, SOG, glTF `KHR_gaussian_splatting` | Streamed SOG with LOD (`lod-meta.json`), memory and splat budgets | None: local coordinates, left-handed by default      | None built in                                                       |
| CesiumJS 1.146.0 (gallery) | Apache 2.0                                  | CesiumJS (WebGL2)           | 3D Tiles with glTF `KHR_gaussian_splatting` + SPZ (both required)      | Hierarchical 3D Tiles LOD, streamed by screen-space error         | Root transform to ECEF (EPSG:4978) on a WGS 84 globe | Terrain, imagery, OSM Buildings, measurement, swipe (this app)      |
| ArcGIS Maps SDK 5.1.27     | Proprietary (Esri Master License Agreement) | ArcGIS `SceneView` (WebGL2) | `GaussianSplatLayer` from a scene service or portal item (3D Tiles)    | Streamed scene service                                            | Georeferenced layer in a global or local scene       | Basemap, elevation, 3D analysis widgets; some unsupported on splats |

Mobile: all four lab pages render at 390 px in Playwright's emulated viewport; touch orbiting
was not tested on a real phone. (Correction, 2026-10-28: on the PlayCanvas page the 390 px view
was black until the inline-size fix above, because only the empty top-left corner of the
1280 px canvas was visible. Session 7 had missed this.) On the ArcGIS page the map widgets
cover much of the small view.
Documentation (my assessment): Spark has a dedicated docs site with guides; PlayCanvas a user
manual and many engine examples; Babylon.js one deep-dive page plus Playground examples;
CesiumJS and ArcGIS an API reference plus Sandcastle examples or samples. The same table, with
integration lines, is on the lab index page (`src/lab/comparison.js`).

Sources (checked 2026-10-27): [Spark: loading splats](https://sparkjs.dev/docs/loading-splats/),
[Spark: level of detail](https://sparkjs.dev/docs/lod-getting-started/),
[PlayCanvas: splat formats](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/),
[Babylon.js: Gaussian splatting](https://doc.babylonjs.com/features/featuresDeepDive/mesh/gaussianSplatting),
[ArcGIS: `GaussianSplatLayer`](https://developers.arcgis.com/javascript/latest/references/core/layers/GaussianSplatLayer/),
the npm `license` field of each package, and `node_modules/@arcgis/core/LICENSE.md`.

The main finding is the geospatial difference. The three general-purpose viewers place the
splat in an arbitrary local frame, each with its own axis convention that the app had to fix by
hand. CesiumJS and ArcGIS put splats on the globe through a georeferenced 3D Tiles transform and
add terrain, basemaps and measurement. The cost is a bigger stack and, for CesiumJS, a tiling
step (3D Tiles) before a PLY can be shown.

### Limits of the lab

- One machine, one browser, one splat (200,258 splats), localhost network. The frame rate hit
  the display cap, so it does not rank the viewers.
- The camera path is the same circle in every viewer, but each engine's projection and near/far
  handling differ slightly, so the images are close, not pixel-identical.
- "First frame" relies on each engine's own load signal; sorting may finish a frame or two later.
- JS heap leaves out ArrayBuffers and GPU memory.
- ArcGIS and CesiumJS were not benchmarked on the test splat.

## Cesium ion Token and Security

- The token is read from `.env` as `VITE_CESIUM_TOKEN`. `.env` is git-ignored, so do not commit
  it.
- Vite embeds `VITE_` variables in the client bundle, so **the token is public in a production
  build**. For deployment, use a separate token with minimal scopes that is restricted to the
  deployed URL in Cesium ion.
- Deliberate exception: the four gallery ion assets (splats and mesh) are public, but they
  belong to Cesium's own account and are not in the Asset Depot. They are requested with
  Cesium's built-in evaluation token (`CESIUM_EVALUATION_TOKEN` in `src/viewer.js`, captured
  before our token replaces it), which is passed per request through
  [`IonResource.fromAssetId`](https://cesium.com/learn/cesiumjs/ref-doc/IonResource.html#.fromAssetId).
  Cesium then shows a "default token" notice in the credits. Terrain, imagery and OSM Buildings
  use our own token. A unit test checks that the evaluation token survives after our own token
  is configured.
- Checked on 2026-10-28: our own token **cannot** read the gallery assets. A Node script asked
  `https://api.cesium.com/v1/assets/<id>/endpoint` with our token and printed only the HTTP
  status: 404 for 4547222, 3667783, 3667784 and 3443919, and 200 for Cesium World Terrain (1).
  So the exception is needed for as long as these assets are used. Whether that is acceptable is
  discussed under [Limitations](#limitations).
- The iTwin share key is in `src/config.js`. It is public (published in Cesium's repository)
  and grants read access to that one iTwin only.

## Attribution and Licences

On-screen credits come from Cesium's credit display, which is kept enabled on purpose. The
panel and each marker's InfoBox also show each splat's credits.

| Data                                                  | Source                                         | Licence / terms                                                           |
| ----------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Cesium World Terrain (ion 1), default imagery (ion 2) | Cesium ion                                     | [Cesium ion Terms of Service](https://cesium.com/legal/terms-of-service/) |
| Cesium OSM Buildings (ion 96188)                      | Cesium ion, © OpenStreetMap contributors       | Cesium ion terms; ODbL for the OSM data                                   |
| Splats 4547222, 3667783, 3667784 and mesh 3443919     | Public Cesium ion assets (Sandcastle samples)  | Cesium ion terms; no separate licence is stated                           |
| O'Shaughnessy Dam splat                               | Bentley iTwin Platform, shared by Cesium       | Bentley iTwin terms; no separate licence is stated                        |
| Place identification                                  | OpenStreetMap (Nominatim, Overpass)            | ODbL                                                                      |
| Viewer lab test splat "SOAR Telescope"                | Luis Cerda, khyron/Gaussian-Splatting          | CC BY 4.0; converted to standard PLY (format change only)                 |
| ArcGIS lab page: "Portcoast industrial" splat layer   | Esri sample (portal item, Portcoast)           | No licence stated on the item; Esri terms                                 |
| ArcGIS lab page: satellite basemap, world elevation   | Esri and its data providers (shown on the map) | Esri terms of use                                                         |

CesiumJS and Babylon.js are licensed under Apache 2.0, Spark, Three.js and PlayCanvas under
MIT. The ArcGIS Maps SDK for JavaScript is proprietary (Esri Master License Agreement; the npm
package may be redistributed unmodified with its copyright notice). Every lab page shows the
credit of the splat it displays and the viewer's licence.

## Accessibility

Checked on 2026-10-28 with Playwright scripts that Tab through each page and record every focus
stop (element, role, accessible name, visible outline). They ran at 1600 and 390 px with
`prefers-reduced-motion: reduce`.

- **Gallery, keyboard.** Every control is a native element with a label: `<button>`s for the
  splats, `<details>/<summary>` for the tools, checkboxes with `role="switch"` inside their
  `<label>`, and a labelled range input. Each one shows a 2 px `:focus-visible` outline. The
  panel now comes before the map in the DOM, so it is the first thing in the tab order. Before,
  Cesium's four credit links came first; they now follow the panel. The panel has `z-index: 1`
  so it still paints above the Cesium widget. Using only the keyboard, a splat can be selected
  (Enter on its button), every tool opened and every switch toggled. The splat buttons are the
  keyboard alternative to clicking the globe markers.
- **Gallery, not keyboard-accessible.** The globe canvas itself: CesiumJS's
  `ScreenSpaceCameraController` handles only mouse and touch, so free navigation and the
  two-point measurement need a pointer. Cesium's ion logo link gets its name only from the
  image's `title` ("Cesium ion"), and the image has no `alt`. That is Cesium's markup and was
  left alone.
- **Lab pages, keyboard.** The canvas is now focusable (`tabindex="0"`). Each page states its
  controls under the title, and the canvas points to that text with `aria-describedby`. The
  keyboard controls are each engine's own, and each was checked by holding keys and comparing
  canvas screenshots:
  - Spark: [`OrbitControls.listenToKeyEvents`](https://threejs.org/docs/#examples/en/controls/OrbitControls)
    on the canvas. Arrows pan, Shift + arrows orbit.
  - Babylon.js: `ArcRotateCamera` with its default inputs. Arrows orbit
    ([Babylon.js cameras](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction)).
  - PlayCanvas: `CameraControls` reads the keyboard only in fly mode, which session 7 had turned
    off (`enableFly: false`), so the page had no keyboard control at all. Fly mode is now on:
    arrows/WASD move the camera, and a mouse drag switches back to orbiting
    ([PlayCanvas camera controls](https://developer.playcanvas.com/user-manual/graphics/cameras/camera-controls/)).
  - ArcGIS: the `SceneView` has its own keyboard navigation. Esri's Calcite buttons draw their
    focus ring inside a shadow DOM, which the script could not inspect, so their focus
    indicator was not verified.
- **Reduced motion.** The gallery's camera flights jump instead of flying (`flightDuration`,
  now unit-tested), and CSS transitions are turned off. The lab pages animate only while the user
  drags, or in `?bench` mode. On the ArcGIS page, `goTo()` follows `prefers-reduced-motion` by
  default (since SDK 4.30, according to the `goTo` docs in `@arcgis/core`).
- **Messages.** Loading and error messages are in an `aria-live="polite"` region, and errors use
  `role="alert"`.

## Limitations

- **Evaluation token on a public site.** Cesium's documentation says the demo token in CesiumJS
  releases is "for trying out our library" and only reaches "a handful of assets", and that
  "all users are required to replace this with an access token from their own ion account once
  they begin development"
  ([Cesium ion access tokens](https://cesium.com/learn/ion/cesium-ion-access-tokens/), read
  2026-10-28). The [ion Terms of Service](https://cesium.com/legal/terms-of-service/) do not
  mention the evaluation token. Since our token cannot read the gallery assets (see
  [Security](#cesium-ion-token-and-security)), the deployed gallery depends on a token that
  Cesium does not intend for deployed apps. My assessment: this is fine for a short-lived,
  clearly labelled course demo, but not as a lasting public site. Nothing guarantees the token
  keeps working, and it is outside Cesium's stated rules. Proper fixes would be to ask Cesium
  for permission, or to tile splats we have rights to into our own ion account.
- **The iTwin share key expires on 2026-12-01 05:13 UTC.** After that, the O'Shaughnessy Dam
  fails to load and the app shows an error for that splat only. A unit test reads the expiry
  from the key, so it is visible ahead of time. The fix is a new share key (Cesium's Sandcastle
  example will need one too) or dropping the dam.
- **Picking accuracy.** Splats write no depth in CesiumJS 1.146, so `Scene.pickPosition`
  returns the terrain, building or mesh behind a splat. Distances measured on a splat are
  therefore distances on whatever lies behind it. From straight above this still gives a
  feature's horizontal position. Heights and vertical distances on a splat cannot be measured.
  The picked point is also limited by depth-buffer precision, which gets worse with distance.
- **The alignment check is not a formal accuracy assessment.** One window per splat was
  registered against Cesium's default imagery, whose own error is unknown. The method uses
  whole-pixel shifts, does not account for relief displacement, and has no independent check
  points and no RMSE. The offsets are relative to the imagery, not absolute.
- **Benchmarks.** One machine (AMD Radeon 780M, 120 Hz display), one browser (Chromium 156), one
  test splat of 200,258 splats, and localhost. The frame rate hit the display cap, so it does
  not rank the viewers. Every viewer follows the same camera circle, but projection and
  near/far handling differ slightly, so the images are close but not identical. The gallery
  performance runs share these limits, and their first-view times depend on the network at the
  time.
- **Accessibility.** The globe and the measurement tool need a pointer. No screen-reader
  description of the 3D content beyond labels and the inspector's text. Not tested with a real
  screen reader or on a real phone (see [Accessibility](#accessibility)).

## Verification

On 2026-10-27 (session 6, the gallery):

- `npm run lint`, `npm run format:check`, `npm test` (9 files, 30 tests) and `npm run build`
  pass.
- Browser checks with Playwright (headless Chromium 156 on an AMD Radeon 780M through ANGLE/D3D11)
  against `npm run preview`, at 1600 × 900 and 390 × 844, with our own token in `.env`. Each
  splat loads and is framed in view. Terrain (ion 1) and imagery (ion 2) were served with our
  token. There were no console errors. The inspector, measurement tool (76.34 m measured along
  the dam road), swipe, dam offset and performance panel were each clicked through, and the
  screenshots were inspected.
- Not verified: Firefox and Safari, a real phone, keyboard-only use of the new tools, and
  whether our own ion token can read the gallery assets.

On 2026-10-27 (session 7, the Viewer lab):

- `npm run lint`, `npm run format:check`, `npm test` (13 files, 48 tests) and `npm run build`
  pass. New tests cover the orbit math, frame statistics, CSV handling, the manifest walk for
  bundle sizes and the line counter.
- Browser checks with Playwright (headless Chromium 156, same GPU) at 1600 and 390 px wide:
  every lab page loads with no console errors. The Spark, PlayCanvas and Babylon.js start views
  were compared side by side and show the splat upright and from the same side. The ArcGIS page
  shows the Esri layer in an oblique view. The index shows both tables; on mobile they scroll
  sideways. The gallery's "Viewer lab" link opens `lab/`.
- The benchmark ran headed on this machine (results above).
- Not verified: touch interaction on a real phone, Firefox and Safari, WebGPU paths of
  PlayCanvas and Babylon.js, and whether the ArcGIS terms allow the page on a public site
  without an Esri account.

On 2026-10-28 (session 8, hardening):

- `npm run lint`, `npm run format:check`, `npm test` (16 files, 55 tests) and `npm run build`
  pass. New tests cover the reduced-motion flight duration, the tileset load statistics (tile
  count, first `initialTilesLoaded` time kept) and the completeness of the comparison table.
- Our ion token gets 404 for the gallery assets (see [Security](#cesium-ion-token-and-security)).
- The splat glTF extensions were checked in the installed CesiumJS 1.146.0 source (see
  [Background](#background-3d-gaussian-splatting)).
- Playwright (headless Chromium, same GPU) against `vite preview` of the production build, at
  1600 and 390 px: the keyboard walk and the lab keyboard controls described under
  [Accessibility](#accessibility), with no console errors. Screenshots were inspected: the panel
  sits above the map at both widths, and the PlayCanvas page now shows the splat at 390 px.
- iTwin failure: with every request to `api.bentley.com` blocked (as after the share key
  expires), selecting the dam shows "O'Shaughnessy Dam could not be loaded." and the button
  reads "Unavailable". Selecting the RTE substation afterwards still works.
- Not verified: a real screen reader, a real phone, Firefox and Safari, and the focus ring of
  Esri's Calcite buttons. The viewer benchmark was not re-run after the PlayCanvas CSS fix.

## Status

Session 6 (globe gallery) is done: gallery, inspector, measurement, alignment check, splat vs
mesh and the performance panel.

Session 7 (Viewer lab) is done: lab pages for Spark, PlayCanvas, Babylon.js and ArcGIS, the
benchmark, and the comparison. CesiumJS is not a lab page (see [Viewer lab](#viewer-lab)).

Session 8 (hardening) is done: background theory, limitations, the own-token check, an
accessibility pass with keyboard controls on the lab pages, the PlayCanvas mobile fix and new
tests.

Next: session 9, the "My GIS module" website (see `report/SPRINT.md`). The gallery itself has no
"← My GIS module" link yet (the lab pages do); session 9 should add it.
