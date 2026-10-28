# 3DGS Viewer

A static web app for opening your own 3D Gaussian splat (3DGS) file and inspecting it in the
browser. You open or drop a `.ply`, `.spz`, `.splat`, `.ksplat` or `.sog` file. The app renders
it with [Spark](https://sparkjs.dev/docs/) on [three.js](https://threejs.org/docs/) and shows
what the file contains. The file is read in the browser and never uploaded.

It is a learning project for TBA4565 at NTNU (3D GIS). It was split out of
[Project 2, Trondheim 3D](../Project%202/README.md) on 2026-10-27 and first had a CesiumJS globe
gallery of georeferenced splats and a viewer benchmark. On 2026-10-28 it was rebuilt as this
viewer (see [History](#history)).

Question for the report: _what does a 3DGS file contain, and how well can a static web page open
and inspect it entirely on the client?_

## Features

- **Open a file.** Use the "Open splat file" button or drop a file anywhere on the page. A
  full-page overlay shows while a file is dragged over it. The file is read with
  [`File.arrayBuffer()`](https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer) and
  passed to Spark as bytes
  (`new SplatMesh({ fileBytes, fileName })`, [Spark docs](https://sparkjs.dev/docs/)). There is no
  server, so the app runs on GitHub Pages and the file stays on the user's machine.
- **File facts.** Name, format, file size, number of splats, the extent of the splat centres
  with and without floaters, and how long opening took. For PLY files it also shows the header:
  encoding, the properties per splat and the spherical-harmonics (SH) degree, which is derived
  from the number of `f_rest_*` properties.
- **Framing that ignores floaters.** Trained splats often have a few stray Gaussians far from the
  scene. The camera frames the central 96 % of splat centres on each axis
  (`coreBounds` in `utils/bounds.js`), not the full bounding box, which would put the scene far
  away.
- **Orientation fix.** Choose which axis of the file points up: +Y, −Y, +Z or −Z. 3DGS training
  output (COLMAP convention) usually has −Y up, which is the default. GIS and CAD data usually
  have +Z up. Reset view frames the splat again.
- **Two-point measurement.** Click two points on the splat to get the straight distance between
  them. Picking uses Spark's `SplatMesh.raycast` through a three.js
  [`Raycaster`](https://threejs.org/docs/#api/en/core/Raycaster), which hits the nearest splat
  ellipsoid. Distances are in the file's own units. They are metres only if the capture was
  scaled, for example with GNSS camera positions or a known distance.
- **Navigation.** Drag to orbit, right-drag to pan, scroll to zoom
  ([`OrbitControls`](https://threejs.org/docs/#examples/en/controls/OrbitControls)). With the
  view focused, the arrow keys pan and Shift + arrows orbit.
- **Splat count** counts splats with finite centres; NaN splats are skipped.
- **Errors** are shown as messages, and the viewer keeps working. This covers unsupported
  extensions, PLY files without splat properties (a mesh or a plain point cloud) and files Spark
  cannot parse. If a new file fails, the splat already open stays.
- A "← My GIS module" link goes back to the homepage. It is the same NTNU-blue link as in the
  other apps. The panel becomes a bottom sheet on mobile.

## Getting Started

Requirements: Node.js 24 or newer. No account or token is needed.

```powershell
npm ci
npm run dev
```

Open the local URL that Vite prints, then open a splat file. Sample files: any 3DGS training
output (`point_cloud.ply`), or SPZ/SOG files exported from tools such as
[SuperSplat](https://superspl.at/editor).

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
  main.jsx               React root only
  App.jsx                composes the hooks and components
  config.js              constants: formats, camera, up axes, markers, homepage link
  viewer/splatViewer.js  three.js + Spark scene (no React): load, frame, orient, pick, markers
  hooks/                 React hooks: the viewer and its load state, file opening and
                         drag and drop, measurement
  components/            React UI: panel, file button and empty state, facts, orientation,
                         measurement, messages
  state/                 framework-independent message store
  utils/                 pure helpers: PLY header, file formats, bounds and camera framing,
                         up-axis rotations, distance, formatting
tests/                   Vitest unit tests for the pure helpers and the message store
```

Main design choices:

- **The engine stays out of React.** `viewer/splatViewer.js` owns the three.js objects and offers
  a small API (`load`, `resetView`, `setUpAxis`, `pick`, `setMarkers`, `dispose`). The hooks
  call it and keep only UI state. This is the same split as the Cesium code in Project 2.
- **Spark.** Spark reads all five formats from bytes, and it is a three.js object, so the
  three.js raycaster, controls and helpers work with it. It had already been integrated in the
  old viewer lab (see [History](#history)), together with PlayCanvas and Babylon.js. The cost is bundle size: the
  production JavaScript is 3,496.1 kB (1,168.1 kB gzip), most of it Spark (`npm run build`,
  2026-10-28).
- **One group for the splat and the markers.** The up-axis rotation is applied to a parent
  `THREE.Group`. So picked points are stored in file coordinates, and a measurement stays valid
  when the orientation changes.
- **The header is read before Spark.** `parsePlyHeader` reads the PLY header from the same
  bytes, both for the facts and to reject PLY files that are not splats with a clear message.
  Spark itself only reports "Expected N splats, got M"-style errors.
- **Markers drawn after the splats.** Spark draws splats in three.js's transparent pass. The
  markers are transparent sprites with `renderOrder = 1` and no depth test, so they draw after
  the splats and stay visible. They have a fixed size on screen, whatever the scale of the
  scene.

## Background: 3D Gaussian splatting

**What it is.** 3D Gaussian splatting (Kerbl et al., 2023) represents a scene as millions of
small, semi-transparent 3D Gaussians. Each one has a position (its mean), a shape and size (a
covariance, stored as a scale per axis plus a rotation quaternion), an opacity, and a colour
stored as spherical-harmonic coefficients, so the colour can change with the viewing direction.
The Gaussians are optimised from photos whose camera poses come from structure from motion
(e.g. COLMAP), starting from its sparse point cloud. To render a view, each Gaussian is
projected to a 2D ellipse (a "splat"). The splats are sorted by depth and alpha-blended, which is
fast enough for real time on a GPU. Because the sort depends on the camera, the viewer re-sorts
as the camera moves.

**Splats vs meshes and point clouds.** A mesh is an explicit surface: vertices joined by
triangles, with a texture. It has topology, so it can be picked, clipped and measured, but thin
structures and reflections are hard to reconstruct. A point cloud contains samples on the
surface, each with a position and usually a colour, but with no size or orientation. A Gaussian
has an extent, an orientation and an opacity. It is fitted to reproduce the photos (a
photometric loss), not to sit on the surface. So it gives a photorealistic image without
guaranteeing that any one Gaussian marks a surface point. This is why a measurement on a splat
(nearest ellipsoid under the pointer) is only approximate. It is also why the viewer rejects a
PLY file that has positions but no `scale_*`, `rot_*`, `opacity` and `f_dc_*`: that file is a
point cloud or mesh, not a splat.

**File formats** (all read by Spark 2.4.0):

- **PLY**: the output of the reference implementation. One binary record per splat: `x y z`,
  `rot_0..3`, `scale_0..2` (log scale), `opacity` (logit), `f_dc_0..2` (SH degree 0) and
  `f_rest_*` (higher SH degrees). Each colour channel has (d + 1)² − 1 coefficients above
  degree 0, so degree 3 means 45 `f_rest` values. The test file below has exactly these 59
  floats per splat. Simple and universal, but large.
- **SPZ**: Niantic's open compressed format ([nianticlabs/spz](https://github.com/nianticlabs/spz)),
  which quantises the attributes and gzips them. It is also the payload of the glTF extension
  `KHR_gaussian_splatting_compression_spz_2`.
- **SOG**: PlayCanvas's compressed format, which stores the attributes in images
  ([PlayCanvas formats](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/)).
- **.splat** (antimatter15) and **.ksplat** (Mark Kellogg's
  [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D)): compact formats from early
  web viewers, with no or limited SH.

**Georeferencing, and what this viewer does not do.** A splat trained from photos lives in the
arbitrary frame of the structure-from-motion solution: unknown origin, orientation and often
scale. The test file has +y pointing down. To overlay it on terrain or measure it in metres, it
must be tied to a CRS through GNSS camera positions or ground control points. The glTF extension
[`KHR_gaussian_splatting`](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_gaussian_splatting)
inside 3D Tiles (ratified by Khronos, checked 2026-10-28) carries splats with a root transform
onto the globe, which is how CesiumJS streams them. This viewer reads single local files, so it
shows the file's own frame and units. The up-axis choice is the only "georeferencing" step, and
the measurements are in file units.

Reference: B. Kerbl, G. Kopanas, T. Leimkühler and G. Drettakis, "3D Gaussian Splatting for
Real-Time Radiance Field Rendering", _ACM Transactions on Graphics_ 42(4), July 2023
([project page](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)).

## Accessibility

- **Keyboard.** The panel comes first in the DOM. The tab order goes from "← My GIS module" to
  the panel toggle, the "Open splat file" button, the facts' `<details>`, then the up-axis
  chips. All are native `<button>`/`<a>`/`<summary>` elements with a 2 px `:focus-visible`
  outline. The canvas is focusable (`tabindex="0"`) and described by a hidden text that lists
  the mouse and keyboard controls. With the canvas focused, the arrow keys move the view and the
  page does not scroll. Opening a file, choosing the up axis, resetting the view and clearing a
  measurement all work from the keyboard.
- **Not keyboard-accessible:** picking measurement points needs a pointer (mouse or touch), and
  the panel says so. Escape stops measuring.
- **Messages.** Loading and error messages are in an `aria-live="polite"` region, and errors use
  `role="alert"`. An error disappears after 10 s, or when the next file is opened.
- **Reduced motion.** There are no camera animations. Reset and orientation changes jump
  straight to the new view, and CSS transitions are turned off under
  `prefers-reduced-motion: reduce`.

## Limitations

- **Memory.** The whole file is read into memory, and Spark then builds its own packed copy. The
  browser's memory is the limit, and the app sets no size limit of its own. Only a 47 MB file was
  tested (see [Verification](#verification)).
- **One file at a time**, and only single-file formats. A multi-file SOG (`meta.json` plus
  images) or a 3D Tiles tileset cannot be opened.
- **No real-world frame or scale.** See [Background](#background-3d-gaussian-splatting).
  Distances are in file units, and the up-axis choice covers only 90° steps about x.
- **Measurement accuracy.** A pick hits the nearest splat ellipsoid along the ray, not a surface.
  Semi-transparent floaters in front of the scene can be hit first.
- **Formats tested.** Only plain PLY was opened in the browser. Compressed PLY is recognised
  from its header (unit-tested), but Spark's decoding of it was not tried. SPZ, .splat, .ksplat and SOG are read by
  Spark's own loaders and were not tested here.
- **Bundle size.** 1,168.1 kB of gzipped JavaScript must download before the first file can be
  opened. Vite warns about the chunk size. Code-splitting Spark was not tried.

## Test data

Verification used the "SOAR Telescope" splat by Luis Cerda
([source](https://github.com/khyron/Gaussian-Splatting),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)), converted to a standard PLY in
session 7. It is no longer in the repo or on the site. The app ships no splat data, so it shows no
third-party data credits; Spark (MIT, World Labs) and three.js (MIT) are its rendering
libraries.

## Verification

2026-10-28, after the rebuild:

- `npm run lint`: no problems. `npm run format:check`: "All matched files use Prettier code
  style!" `npm test`: 7 files, 26 tests passed. `npm run build`: `dist/` is 3.4 MB, with one JS
  file of 3,496.05 kB (1,168.14 kB gzip) and no `cesium/` folder. A search for
  `cesium|itwin|ion.cesium` in `src/`, `index.html` and `dist/` found nothing.
- Playwright on `vite preview` (headless Chromium, `--use-angle=d3d11`) at 1600 × 900 and
  390 × 844, with the screenshots looked at:
  - Opening the SOAR PLY through the file input renders the telescope upright with −Y up. The
    facts show 200 258 splats, 45.1 MiB, "binary_little_endian 1.0", 59 properties and SH degree 3. Extent: 7.303 × 3.438 × 9.494 units, against 9.209 × 4.154 × 10.770 units for the full
    box, so floaters add about 26 % in x. Opened in 0.24–0.27 s.
  - Wrong files, each giving a message while the open splat stays: a `.txt` ("not a supported
    splat file"), an ASCII PLY with only x y z ("no Gaussian splat properties (missing scale_0
    …)"), and a PLY truncated to 5,000 bytes (Spark: "Expected 200258 splats, got 14").
  - Drag and drop with synthetic `DragEvent`s: the overlay appears on `dragenter`, disappears on
    `drop`, and the dropped file goes through the same checks.
  - Five ArrowLeft presses on the focused canvas change the rendered image, and `scrollY` stays 0.
  - The +Z chip turns the view to top-down (a different image), and −Y plus Reset view frame it
    again.
  - Measure: two clicks on the hillside give "Distance: 2.573 units". Both markers and the line
    are visible on top of the splat.
  - Tab order: "← My GIS module" → "Hide controls" → "Open splat file" → "PLY properties" → "+Y".
  - At 390 px, the empty state is centred above the collapsed bottom sheet, and the expanded
    sheet shows all facts. No console errors at 390 px. At 1600 px the only console error is
    Spark's message for the truncated file, which is logged on purpose because it is an engine
    error.
- `/code-review` (medium) of the rebuild found 10 issues. All were fixed except the deletions it
  flagged, which were planned and approved. Fixes: compressed PLY files (SuperSplat
  `packed_*`) are no longer rejected but passed to Spark; NaN splat centres are skipped so
  framing cannot become NaN; centres are collected into one preallocated array; the
  `SparkRenderer` is disposed; only the primary button picks measurement points; Escape inside
  `<details>` or a form field no longer stops measuring; a file opened while another loads gets
  a message instead of being dropped silently, and the drop listeners are no longer re-attached
  while loading; the click tolerance moved to `config.js`; the root CLAUDE.md no longer refers
  to the deleted benchmark. Re-checked: lint, format check, 26 tests and build pass; the
  Playwright run gives the same results as above; a right click while measuring adds no point;
  Escape in `<details>` keeps measuring, and on the canvas it stops.
- **Not verified:** compressed PLY files in the browser (no test file), real phones, Firefox and Safari, a screen reader, files much larger than
  47 MB, and the SPZ, .splat, .ksplat and SOG formats.

## History

Sessions 6–8 (2026-10-27/28) built a CesiumJS 1.146 globe gallery of four georeferenced splats:
three public Cesium ion assets and one Bentley iTwin reality-data tileset. It had a
georeferencing inspector, a measurement tool, an alignment check against terrain, imagery and
OSM Buildings, and a performance panel. The same sessions built a Viewer lab that benchmarked
Spark, PlayCanvas and Babylon.js on one splat and showed Esri's sample layer in the ArcGIS Maps
SDK.

It was dropped on 2026-10-28 for this reason: the ion assets belong to Cesium's own account.
Our own token gets 404 for them, so they could only be loaded with CesiumJS's built-in
evaluation token, and Cesium's
[token docs](https://cesium.com/learn/ion/cesium-ion-access-tokens/) say that token must be
replaced "once they begin development". The iTwin share key expires on 2026-12-01. Esri's sample
states no licence. Georeferenced splats with a licence that allows public re-use were not found
in time, so the project became a viewer for the user's own files.

All of that code, its README (with the alignment and benchmark results) and the scripts are in
git history at commit `9442d81`.

## Status

The rebuild as a file viewer is done (2026-10-28).

Website (2026-10-28, sprint session 9): the app is built into `/3dgs-viewer/` of the "My GIS
module" site by the root `npm run site:build`. The home link was restyled to the shared NTNU-blue
link, and the app got the shared favicon. Lint, format check, tests (7 files, 26 tests) and build
pass. The assembled site, served under the repository prefix, passed a Playwright round trip
(homepage → 3DGS Viewer → "← My GIS module" → homepage) at 1600 and 390 px with no console
errors or failed requests. The homepage card's screenshot shows the "SOAR Telescope" splat
(see [Test data](#test-data)), loaded from git history only for that screenshot. The splat is
credited on the homepage and is still not in the repository.

Live (2026-10-28): deployed at
<https://progrimm.github.io/TBA4565-Geomatics-Specialization-Course/3dgs-viewer/> by the
[Pages workflow](https://github.com/progrimm/TBA4565-Geomatics-Specialization-Course/actions/runs/40763110583), with [Project 3 CI](https://github.com/progrimm/TBA4565-Geomatics-Specialization-Course/actions/runs/40763110560) passing on GitHub.
The Playwright round trip passed at 1600 and 390 px with no console errors or failed requests.
Opening a file on the live site was not tested.
