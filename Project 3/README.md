# 3DGS Viewer

A static web app for opening your own 3D Gaussian splat (3DGS) file and inspecting it in the
browser. You open or drop a `.ply`, `.spz`, `.splat`, `.ksplat` or `.sog` file. The app renders
it with [Spark](https://sparkjs.dev/docs/) on [three.js](https://threejs.org/docs/) and shows
what the file contains. The file is read in the browser and never uploaded. Up to four splats can
be compared side by side in tiled panes.

It is a learning project for TBA4565 at NTNU (3D GIS). It was split out of
[Project 2, Trondheim 3D](../Project%202/README.md) on 2026-10-27 and first had a CesiumJS globe
gallery of georeferenced splats and a viewer benchmark. On 2026-10-28 it was rebuilt as this
viewer (see [History](#history)).

Question for the report: _what does a 3DGS file contain, and how well can a static web page open
and inspect it entirely on the client?_

## Features

- **Open a file.** Use the "Open splat file in Pane N" button in the panel, the folder button in
  a pane's bar, or drop a file on a pane. An overlay shows on the pane while a file is dragged
  over it. The file is read with
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
- **Ellipsoid view.** A slider per pane, "Opaque ellipsoids" 0–100 %, shows the Gaussians
  themselves instead of the blended image. 0 % is the normal render. Towards 100 % each splat's
  opacity is pulled towards 1 (α′ = max(α, mix(α, 1, t)), never lower than before). Its
  Gaussian falloff also turns into a flat fill, cut at the 1σ ellipse instead of Spark's default
  √8 σ. The opacity is changed on the GPU by a Spark object modifier (a dyno graph run on every
  splat; `objectModifier` on `SplatMesh`), and the kernel by the pane's `SparkRenderer`
  `falloff` and `maxStdDev` ([Spark docs](https://sparkjs.dev/docs/)). The file's data is not
  changed, so the slider is instant and reversible. The setting is per pane, so one pane can show
  the normal render and another the same file as ellipsoids, with linked cameras. It is kept
  when another file is opened in that pane. PSNR/SSIM renders always use the normal render.
  Picking is not affected, because Spark's raycast reads the stored splats.
- **Two-point measurement.** Click two points on the splat to get the straight distance between
  them. Picking uses Spark's `SplatMesh.raycast` through a three.js
  [`Raycaster`](https://threejs.org/docs/#api/en/core/Raycaster), which hits the nearest splat
  ellipsoid. Distances are in the file's own units, or in m or cm once a scale or coordinate
  system is applied (then the picked points are also shown in that frame).
- **Scale & coordinate system** (per pane), two methods. It was first called "Georeference" and
  renamed on 2026-11-05: it assigns a local Cartesian frame, not a CRS, so it is not a
  georeference in the strict sense (see [Background](#background-3d-gaussian-splatting)).
  - _Known distance._ Pick two points and type their real length in m or cm. This gives one scale
    factor (known ÷ picked). The file's origin and axes are kept, so coordinates become file
    coordinates × scale. The view does not change.
  - _Known coordinates._ Define your own frame (right-handed, Z up, in m or cm), for example
    with a table corner as the origin. Pick 3 or more points on the splat and type their X, Y, Z.
    The app fits a 7-parameter similarity (Helmert) transform from the file frame to yours by
    least squares: 1 scale, 3 rotations and 3 translations. It shows the scale, the rotation (angle
    and axis), where your origin lies in the file, the residual per point (dX, dY, dZ, |d|) and the
    RMSE. The view is then levelled so your +Z is up, which replaces the up-axis guess. Your
    origin is drawn as O with the X (red), Y (green) and Z (blue) axes.
  - The fit is Horn's closed-form unit-quaternion solution
    ([Horn 1987](https://doi.org/10.1364/JOSAA.4.000629)), with the scale as in
    [Umeyama 1991](https://doi.org/10.1109/34.88573), so the residuals are least squares in your
    frame. It needs no iteration and cannot return a mirrored frame. Collinear points are rejected.
    The splat is only rotated on the GPU, never scaled or moved, and the transform stays in
    float64 in JavaScript.
  - _Save / Load_ writes the picks and coordinates to a small JSON file and reads them back. The
    result is recomputed on load, and there is a warning if the JSON was made for another file.
    Opening another file in the pane clears the scale or coordinate system. The file format is
    `3dgs-viewer-coordinate-system`; JSON saved before the rename (`3dgs-viewer-georeference`) is
    not read.
  - Only one tool picks at a time: starting to pick in Scale & coordinate system stops
    Measure, and the other
    way round.
- **Navigation.** Drag to orbit, right-drag to pan, scroll to zoom
  ([`OrbitControls`](https://threejs.org/docs/#examples/en/controls/OrbitControls)). With the
  view focused, the arrow keys pan and Shift + arrows orbit.
- **Tiled panes (up to 4).** Like a tiling terminal (Terminator), each pane's bar has buttons to
  split it right or down and to close it. The dividers between panes can be dragged, or focused
  and moved with the arrow keys. Each pane has its own view, splat, facts, up axis and
  measurement. Clicking or focusing a pane makes it active (outlined); the panel shows the active
  pane's tools. Pane numbers stay with a pane, and a new pane takes the lowest free number. On
  narrow screens (640 px or less) every split stacks vertically.
- **Linked cameras.** "Link cameras" copies the active pane's camera to the others, and from then
  on the other panes follow whichever pane is moved. This lines the splats up only when they are
  in the same frame, for example exports of the same capture, with the same up axis.
- **Backgrounds** for all panes: NTNU navy (the default), black and sky. The sky is generated in
  the browser; no image is downloaded.
- **Photos from COLMAP.** "Open COLMAP folder" reads the undistorted workspace the splat was
  trained from (`dense/` with `sparse/` and `images/`, or a project with `sparse/0/`), as
  `cameras.bin`/`images.bin` or the `.txt` files. The cameras are drawn as frustums around the
  splat in every pane. Choosing a photo puts the active pane (all panes when cameras are linked)
  exactly at the photo's camera, and the photo is laid over the view: Swipe (draggable line),
  Blend (opacity), Photo, Splat (outline only) or Difference (error image). Orbiting leaves the
  photo view.
- **Train/test split.** "Test photos: every Nth" marks every Nth photo by sorted name as a test
  photo (held out in training), as the reference 3DGS code (`llffhold = 8`) and gsplat
  (`test_every = 8`) do. 0 means all photos were training photos. Set it as in training.
- **PSNR and SSIM per pane.** "Evaluate all photos" (or only the test photos) renders the pane's
  splat at every photo's camera and full size, compares it with the photo, and shows the means
  per role, a table per photo and a CSV download. "Splat area" columns (PSNR\*, SSIM\*) count
  only the pixels the splat covers, for splats cropped to an object.
- **One photo in numbers.** "Evaluate IMG_….JPEG" evaluates only the chosen photo. It shows PSNR
  and SSIM, the coverage, the mean colour offset render − photo per channel, and the per-pixel
  error (mean |render − photo| over R, G, B) as mean, median, 95th percentile, share of pixels
  with an error of 10 % or more, and a histogram in 1 % bins (hover a bar for its value), over
  the splat area or the whole photo. The difference image in the pane gets a colour scale, and
  hovering it shows the pixel's render and photo RGB values and its error.
- **Splat count** counts splats with finite centres; NaN splats are skipped.
- **Errors** are shown as messages, and the viewer keeps working. This covers unsupported
  extensions, PLY files without splat properties (a mesh or a plain point cloud) and files Spark
  cannot parse. If a new file fails, the splat already open stays.
- **Panel.** On wide screens the controls panel can be resized by dragging its right edge (or
  focusing the handle and using the arrow keys), from 260 to 640 px, always leaving room for the
  panes; the panes start right of it, and the width is remembered in this browser. Every tool
  (File, Orientation, Measure, Compare with the photos, All panes, Photos) folds open and closed;
  that is remembered per tool, also when another pane becomes active.
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
  config.js              constants: formats, camera, up axes, ellipsoid view, markers, panes,
                         backgrounds, scale & coordinate system, homepage link
  viewer/splatViewer.js  three.js + Spark scene (no React): load, frame, orient, pick, markers,
                         camera view for linking, background
  viewer/backgrounds.js  colour and sky cube map backgrounds (no React)
  viewer/photoCameras.js frustums of the COLMAP photos (no React)
  viewer/frameOverlay.js  numbered control points and the user's origin/axes (no React)
  workers/               Web Worker: decodes a photo, computes PSNR, SSIM and the difference
                         image (several run side by side, see utils/workerPool.js)
  hooks/                 React hooks: the viewer and its load state, file opening and
                         drag and drop per pane, measurement, linked cameras, media query,
                         COLMAP photos, evaluation
  components/            React UI: panel, tiled pane layout and dividers, pane, file button and
                         empty state, facts, orientation, measurement, "All panes", photos,
                         photo overlay, evaluation, messages
  state/                 framework-independent stores: messages, which tools are open
  utils/                 pure helpers: PLY header, file formats, bounds and camera framing,
                         up-axis rotations, ellipsoid view settings, distance, formatting,
                         pane layout tree, COLMAP parsing, photo cameras, PSNR/SSIM,
                         local frame (scale, similarity transform, JSON), worker pool
tests/                   Vitest unit tests for the pure helpers and the message store
```

Main design choices:

- **The engine stays out of React.** `viewer/splatViewer.js` owns the three.js objects and offers
  a small API (`load`, `resetView`, `setUpAxis`, `pick`, `setMarkers`, `setLevelRotation`,
  `setControlPoints`, `setFrameAxes`, `dispose`, …). The hooks
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

- **One viewer per pane.** Each pane runs its own `createSplatViewer`: its own
  `WebGLRenderer` (one WebGL context), `SparkRenderer`, camera and controls. The engine code did
  not have to change for this. Spark's decode and sort workers are one shared pool for the page
  (`workerPool` in Spark 2.4.0, at most 4 workers), so they are not multiplied by the panes.
  Browsers limit a page to a number of live WebGL contexts (about 16 in Chromium), and the open
  splats share the machine's memory, so `MAX_PANES` in `config.js` is 4. The panes split the
  screen between them, so together they draw about as many pixels as one full-screen view.
- **Render on demand** (2026-11-06). A pane used to redraw on every display frame, even when
  nothing moved. Now `splatViewer.js` draws a frame only after `requestRender()`
  ([three.js: rendering on demand](https://threejs.org/manual/#en/rendering-on-demand)). Calls
  come from OrbitControls' `change` event (mouse, touch, keys), from every setter (background,
  up axis, markers, photos, ellipsoid view, local frame), from resize and load, and from Spark.
  Spark sorts the splats by depth in a worker, so a new sort order arrives a few frames after
  the camera stopped. `SparkRenderer`'s `onDirty` callback (Spark 2.4.0,
  [docs](https://sparkjs.dev/docs/)) asks for that frame. Frames continue for
  `RENDER.settleMs` (500 ms) after the last request as a safety margin. Between frames the
  canvas keeps showing the last image, so an idle pane costs no GPU time. The offscreen photo
  renders pause the pane with a flag instead of stopping an animation loop.
- **A layout tree, rendered flat.** The layout is a binary tree (`utils/layout.js`): a leaf is a
  pane, an inner node splits its area in two (`row` = side by side, `column` = stacked) at a
  `ratio`. Rendering the panes nested inside the tree would make React remount a pane, and so
  destroy its WebGL context and splat, whenever it is split or its neighbour is closed, because
  its place in the element tree changes. `computeLayout` therefore turns the tree into a flat
  list of rectangles (fractions of the area), and the panes are one keyed list of absolutely
  positioned elements. A pane's identity is only its `key`
  ([React: preserving state](https://react.dev/learn/preserving-and-resetting-state)).
- **Dividers** follow the ARIA
  [window splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/):
  `role="separator"` with `aria-valuenow`, focusable, moved with the arrow keys. Dragging uses
  [`setPointerCapture`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture),
  so the drag keeps going over a canvas. The canvases already follow their size through the
  viewer's `ResizeObserver`.
- **The active pane portals its tools.** The active pane renders its own file button, facts,
  orientation and measurement sections into the panel with
  [`createPortal`](https://react.dev/reference/react-dom/createPortal). Each pane keeps its own
  hooks and state, and the panel looks as before. The "All panes" section (backgrounds, link) is
  owned by `App`.
- **Linked cameras** copy the camera position and the orbit target, in the viewer frame (after
  the up-axis fix), from the moved pane to the others. They listen to OrbitControls' `change`
  event; `setView` does not report its own change, so two linked panes do not echo each other.
- **Backgrounds live in the world frame.** They are set as
  [`scene.background`](https://threejs.org/docs/#api/en/scenes/Scene.background), which three.js
  draws at infinity: it turns with the camera, but not with the model group. So after the
  up-axis fix the sky's horizon is level and the splat stands on it. With a wrong up axis the
  splat tilts while the horizon stays level, which makes the orientation fix easy to see.
- **Sky** is three.js's [`Sky`](https://threejs.org/docs/#examples/en/objects/Sky) shader: the
  Preetham daylight model (Rayleigh and Mie scattering, with clouds in three.js r186). It is
  rendered once per pane into a cube map with a
  [`CubeCamera`](https://threejs.org/docs/#api/en/cameras/CubeCamera). A Sky mesh in the scene
  would cost a draw every frame and would depend on the camera's far plane, which here is set
  from the splat's size. The shader outputs high-dynamic-range light and expects the renderer to
  tone-map it. Renderer tone mapping would also change the splat colours, and a render target
  gets none, so a filmic curve (Narkowicz's fit of ACES) is baked into the sky shader. Below the
  horizon the sky fades to a plain ground colour, so the usual view from above does not look into
  white haze. The first version without the baked curve rendered almost white; that was seen in
  the screenshots and fixed.
- **Look: square geometry and fiducial marks** (`style.css`). The panel is a full-height
  sidebar, and boxes, buttons, fields, toasts and pane frames have square corners, like a survey
  sheet. Rounded on purpose are only the shared "← My GIS module" link (the same in every app of
  the module), the measurement markers and the ends of the histogram bars. Option groups (up
  axis, background, comparison mode) are segmented controls whose buttons share their borders.
  The memorable element is the fiducial marks: each view and the photo frame carry corner marks
  like those on an aerial photo, which photogrammetry uses for the photo's interior orientation.
  Titles use the homepage's display face, Bricolage Grotesque, self-hosted with
  `@fontsource-variable/bricolage-grotesque` 5.3.0, so the page makes no request to a font CDN.

- **COLMAP photo → three.js camera** (`utils/colmap.js`, `utils/photoCamera.js`). COLMAP stores
  for each image the world-to-camera rotation R (quaternion qw qx qy qz) and translation t
  ([output format](https://colmap.github.io/format.html)); the camera centre is C = −Rᵀt. COLMAP's
  camera looks along +z with y down, a three.js camera along −z with y up, so the camera-to-world
  rotation is Rᵀ · diag(1, −1, −1). The poses are used inside the model group, so the up-axis fix
  turns them with the splat. COLMAP 3.12 adds `rigs.bin` and `frames.bin`, but `images.bin` keeps
  its layout. Only the undistorted pinhole models (PINHOLE, SIMPLE_PINHOLE) are accepted: a
  three.js camera has no lens distortion, and 3DGS trains on the undistorted images too.
- **Projection from the intrinsics.** The projection matrix is built from fx, fy, cx and cy, so
  an off-centre principal point is kept. It is then scaled so that the photo's frame fits inside
  the pane (letterboxed), and the photo overlay uses the same rectangle (`fitRect`). A unit test
  projects a 3D point both the COLMAP way and through the three.js camera and gets the same pixel.
  In photo view, OrbitControls is paused: its `lookAt` would level out the photo's roll. Any
  orbit, pan or zoom leaves photo view, and the view is then a novel view with no photo to
  compare.
- **Evaluation renders.** A second `SparkRenderer` with a render `target` of the photo's size
  renders offscreen (Spark's "additional viewpoints"); `await update()` waits until the splats
  are sorted for that camera, and `renderReadTarget()` returns the RGBA bytes (bottom row first,
  so they are flipped). The background is transparent black, the 3DGS default, and the alpha
  channel gives the splat's coverage. The photo is decoded with `createImageBitmap` ignoring
  EXIF rotation and colour profiles (`imageOrientation: 'none'`,
  `colorSpaceConversion: 'none'`), as COLMAP and the training code read the raw pixels.
- **Metrics as in the 3DGS evaluation** (`utils/metrics.js`): PSNR = 10 · log10(1 / MSE) over
  R, G, B in [0, 1]; SSIM (Wang et al. 2004) with an 11 × 11 Gaussian window, σ = 1.5, zero
  padding, C1 = 0.01², C2 = 0.03², averaged over pixels and channels. A unit test checks the
  separable implementation against a direct one. The means per role are means of the per-photo
  values. LPIPS is not computed: it needs a neural network. SSIM on a 1539 × 2058 photo runs in
  [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API), so the page
  stays responsive.
- **Evaluation in parallel** (2026-11-06). The GPU renders the photos one at a time, but
  comparing a photo (decode the JPEG, SSIM with fifteen 11-tap blurs over 3.2 million pixels)
  takes far longer than rendering it, and it only uses one CPU core. A small pool of workers
  (`utils/workerPool.js`, `EVALUATION.workers` = 4, at most the number of cores − 1)
  therefore compares several photos at once while the next one renders. At most one photo per
  worker is in flight, so renders do not pile up in memory. The photo is decoded in the worker
  (`createImageBitmap` and `OffscreenCanvas` work there too), not on the main thread. The SSIM
  blur itself was also made faster without changing a single bit of its output. It no longer
  calls a function per pixel, skips the bounds checks inside the rows, and runs the vertical
  pass row by row through memory. Each pixel still sums its taps in the same order in double
  precision, which is why the result stays identical. The trade-off is memory: by array sizes,
  each busy worker needs about 130 MB for a photo of this size (not measured).
- **Error in numbers.** PSNR and SSIM compress a photo into one number each. The per-pixel
  error histogram shows how the error is spread: many small errors (blur, noise) or few large
  ones (missing or wrong geometry, floaters). The colour offset (mean signed difference) shows a
  systematic brightness or colour shift, which raises the error everywhere without being visible
  as a structure in the difference image. Percentiles come from the 256-level histogram, so they
  are exact to one 8-bit level. The difference colour scale is black–red–yellow–white, a
  luminance-ordered "heat" scale, so more error is always brighter.
- **Training vs test photos.** A photo that was used in training only measures how well the
  splat fits its training data. Only held-out test photos measure novel views. Between the
  photos there is no ground truth at all, so those views can only be judged by eye.

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
shows the file's own frame and units until you give it a scale or a local coordinate system by
hand (since 2026-11-05). That is not georeferencing: no CRS, datum or map projection is involved.
"Known distance" fixes only the scale. "Known coordinates" fits a similarity (Helmert)
transform from 3 or more control points: 7 parameters from 3 equations per point, so 3 points
already give 2 redundant observations, and the residuals show how well the picks fit. It works
in a local frame you define, not in a CRS. The step that remains to a national CRS is to type
projected coordinates (e.g. EUREF89 UTM 32N) for surveyed points, which was not tested.

Reference: B. Kerbl, G. Kopanas, T. Leimkühler and G. Drettakis, "3D Gaussian Splatting for
Real-Time Radiance Field Rendering", _ACM Transactions on Graphics_ 42(4), July 2023
([project page](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)).

## Accessibility

- **Keyboard.** The panel comes first in the DOM. With two empty panes, the tab order is
  "← My GIS module" → "Hide controls" → "Open splat file in Pane 2" → the three background chips
  → "Link cameras" → Pane 1's bar ("Open a splat file in Pane 1", "Split Pane 1 right",
  "Split Pane 1 down", "Close Pane 1") → Pane 1's view → its "choose one" → the same for Pane 2
  → the divider. With a file open, the facts' `<details>`, the up-axis chips and the measure
  buttons come after the open button. Focusing a pane makes it active. All are native
  `<button>`/`<a>`/`<summary>` elements with a 2 px `:focus-visible` outline. Each canvas is
  focusable (`tabindex="0"`) and described by a hidden text that lists
  the mouse and keyboard controls. With the canvas focused, the arrow keys move the view and the
  page does not scroll. Opening a file, splitting and closing panes, moving a divider (arrow
  keys), choosing the background and the up axis, linking cameras, resetting the view and
  clearing a measurement all work from the keyboard.
- **Panel and tools.** The panel's resize handle is a focusable `role="separator"` (arrow keys,
  16 px steps), like the pane dividers. The tools are native `<details>`/`<summary>` elements,
  so they open with Enter or Space.
- **Photos.** The photo list is a native `<select>`, with previous/next buttons; the swipe line
  can also be moved with the "Swipe position" slider, and the metrics are tables with headers.
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
- **Up to four files**, one per pane, and only single-file formats. A multi-file SOG
  (`meta.json` plus images) or a 3D Tiles tileset cannot be opened. Each pane keeps its own copy
  of its splat in CPU and GPU memory, so four large files need four times the memory. Memory use
  and frame rate with four panes were not measured. All panes render every frame, also when
  nothing moves.
- **Linked cameras are only as good as the frames.** Linking copies camera poses; it does not
  align splats. Splats from different captures, or with different up axes, do not line up.
- **One drop, one file.** Dropping several files on a pane opens only the first.
- **Desktop panel column.** On wide screens the panes start right of the panel, also when the
  panel is collapsed.
- **Real-world frame only by hand.** See [Background](#background-3d-gaussian-splatting).
  Without a scale or coordinate system, distances are in file units and the up-axis choice covers only 90°
  steps about x. The Scale & coordinate system tool works in a local Cartesian frame (m or cm, Z up). It has
  no CRS and no map projection, so it cannot take latitude/longitude, and large projected
  coordinates (UTM) were not tested. Its accuracy is limited by the picks, which lie on splat
  ellipsoids (see the next item), and the residuals show this. The drawn axes are 1 px WebGL
  lines and can be hard to see on a busy splat. The extent in File facts is scaled along the file
  axes, not measured along your axes.
- **Measurement accuracy.** A pick hits the nearest splat ellipsoid along the ray, not a surface.
  Semi-transparent floaters in front of the scene can be hit first.
- **Photo comparison.** Only undistorted pinhole COLMAP models. The photos must be the images the
  model was trained on (same pixels); a different exposure, white balance or crop shows up as
  error. Training-time appearance models (per-image exposure) are not reproduced. Metrics are
  computed at the camera's full size; a model trained on downscaled images is compared with the
  full-size photos. No LPIPS. Choosing a COLMAP folder lists every file in it, so a very large
  workspace takes longer to open.
- **Formats tested.** Plain PLY and single-file SOG were opened in the browser. Compressed PLY is
  recognised from its header (unit-tested), but Spark's decoding of it was not tried. SPZ, .splat
  and .ksplat are read by Spark's own loaders and were not tested here.
- **Bundle size.** 1,175.9 kB of gzipped JavaScript must download before the first file can be
  opened. Vite warns about the chunk size. Code-splitting Spark was not tried.

## Test data

The tiled panes (2026-11-03) were checked with the author's own "nugatti" capture, exported from
the same training as PLY with SH degree 1, 2 and 3 and as SOG with SH degree 3. These files are
not in the repo. As read by the app, the SH 1 PLY, the SH 3 PLY and the SOG each have 154 055
splats and the same extent, 1.897 × 1.555 × 1.573 units (2.027 × 1.993 × 1.673 units with
floaters). The SH 1 PLY is 15.3 MiB with 26 properties per splat, the SH 3 PLY 36.4 MiB with 62
properties, and the SOG 3.6 MiB. So they share one frame, which is the case that linked cameras
are for.

The photo comparison (2026-11-03) used the same capture's COLMAP workspace,
`nugatti/dense/`: COLMAP 3.12 output after `image_undistorter`, one PINHOLE camera of
1539 × 2058 px (fx = fy = 1591.52, cx = 769.5, cy = 1029.0) and 44 iPhone 13 photos. The
splats are in the COLMAP frame: before building anything, the median splat centre
(0.096, 2.005, 0.856) was compared with the median sparse point (0.066, 2.209, 0.888), read with
a Python script. The splats were trained on all 44 photos and then cropped to the cup and the
square of table under it.

Verification used the "SOAR Telescope" splat by Luis Cerda
([source](https://github.com/khyron/Gaussian-Splatting),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)), converted to a standard PLY in
session 7. It is no longer in the repo or on the site. The app ships no splat data, so it shows no
third-party data credits; Spark (MIT, World Labs) and three.js (MIT) are its rendering
libraries.

## Verification

2026-11-06, speed and efficiency (no feature removed):

- What changed:
  - A faster SSIM blur, with output identical to the old one.
  - A pool of 4 metric workers, with the photos decoded in the workers.
  - Render on demand instead of a redraw on every display frame.

  See "Evaluation in parallel" and "Render on demand" above.

- Setup for all numbers below: this machine (AMD Radeon 780M, 16 logical cores, Node 24.20.0).
  The browser runs were Playwright's Chromium, headless, with the GPU on
  (`--use-angle=d3d11 --enable-gpu`, renderer string "ANGLE (AMD, AMD Radeon(TM) 780M …
  Direct3D11)"), on `vite preview` at 1600 × 900. The data was `nugatti_plySH3.ply` and
  `nugatti/dense` (44 photos, 1539 × 2058). "Before" is a build of commit `adb657b`. The
  rows below name which later build was timed: `f34d6d5` (pool only) or `fd9b346` (pool and
  render on demand). The scripts were throwaway Playwright and Node scripts, not committed.
- SSIM alone (Node, two random 1539 × 2058 images, median of 5 runs, old and new run
  alternately): old 2370 and 2406 ms, new 1355 and 1375 ms. A check script compared
  `ssimMap` of old and new on 9 image sizes from 1 × 1 to 1539 × 2058. Every pixel was
  bit-identical.
- "Evaluate all photos" (the app's own time):

  | Build                      | Runs                      |
  | -------------------------- | ------------------------- |
  | before (1 worker)          | 125.7, 169.4, 264.5 s     |
  | after, 3 workers (trial)   | 43.3 s                    |
  | f34d6d5, 4 workers         | 33.4, 33.3, 33.2, 226.8 s |
  | f34d6d5, 6 workers (trial) | 24.4 s                    |
  | fd9b346, 4 workers (final) | 19.4, 19.4, 19.4 s        |
  - In a profiled "before" run (164.7 s), each worker job took 2.6–5.2 s, and the jobs ran
    back to back. So the single worker was the bottleneck, not the GPU.
  - With the pool, 4 jobs overlap: about 2.3–4.0 s each on `f34d6d5`, and 1.6–1.9 s each on
    `fd9b346` (first six jobs).
  - The final build is faster again (19.4 s against ≈ 33 s), although the evaluation code is
    the same. This fits less CPU and GPU contention once the visible pane stops redrawing at
    120 Hz during the run, but the cause was not isolated.
  - Two pool runs took about 220 s (226.8 s above, and 222.6 s in a trial run), and the before
    series has a 264.5 s run. These
    outliers are not explained. They are probably the machine's power or thermal state, but
    that was not checked. Treat the typical values (≈ 125–170 s before, 19.4 s final) as the
    result, not a precise factor.
  - 6 workers was faster still. 4 was kept to limit memory (see the design note).
  - These numbers come from a different session than the 88.8–102.5 s further down, so the
    two sets are not comparable.

- Same results: every "after" CSV (all 44 photos, full precision) is byte-identical to the
  "before" CSV. So decoding in the worker reads the same pixels.
- One photo in detail ("Evaluate IMG_6424.JPEG", time from click to the button coming back):
  before 3.07, 3.04 and 3.02 s; after 4.14, 2.60 and 3.66 s. This is **not measurably faster**
  on this machine: the pool does not help a single photo, and the render, difference image and
  PNG encoding are unchanged.
- Idle cost (WebGL draw calls counted by wrapping `drawArrays`/`drawElements*`, over 5 s after
  the view settled):

  | Panes | Before | After |
  | ----- | ------ | ----- |
  | 1     | 601    | 0     |
  | 2     | 1202   | 0     |

  Before, that is one frame per pane at the display's 120 Hz.

- Function check (Playwright, both builds, the same script): all 19 checks pass on both, with
  no console errors. A check that "changes the view" passes when a screenshot of the pane
  differs before and after the action. The checks:
  - Orbit drag changes the view, and two shots 1 s later are equal (the view settled).
  - Arrow keys change the view.
  - Reset view changes it, and the result matches the first frame exactly.
  - +Z up axis and the ellipsoid slider at 100 % change the view.
  - The Black and Sky backgrounds change the view.
  - Two measure clicks show the markers and "Distance: …".
  - Picking control point 1 shows its marker.
  - Apply (known coordinates) and "Show your axes" change the view.
  - Choosing IMG_6440 enters photo view.
  - Difference mode shows the difference image, and hovering shows the pixel readout.
  - "Free view" leaves photo view.
  - With Link cameras on, Pane 2 follows a drag in Pane 1.
  - At 390 px the splat opens.
- Screenshots looked at, at 1600 px (two panes; photo view in difference mode with the readout;
  the local frame with control points) and at 390 px. The splat is drawn sharp after settling;
  no pane is blank or stale.
- `npm run lint`: no problems. `npm run format:check`: all files pass. `npm test`: 14 files,
  85 tests passed. New tests: SSIM per pixel against the direct definition for 4 × 13,
  13 × 4, 11 × 11 and 23 × 17 images (edge-only and interior paths), and the worker pool
  (queueing, errors, terminate, size). `npm run build` passes, with the same chunk-size
  warning as before.
- **Not verified:**
  - Memory use with 4 busy workers (only estimated from array sizes).
  - Machines with few cores, where the pool shrinks.
  - Firefox, Safari and real phones.
  - Battery or GPU power: only draw calls were counted.
  - 3 or 4 panes idle.
  - The cause of the ≈ 220 s outliers.

2026-11-05, rename of the georeference tool to "Scale & coordinate system":

- What changed: the tool's title, texts and code names (`georef.js` → `localFrame.js`,
  `useGeoreference` → `useLocalFrame`, `GeoreferenceTool` → `LocalFrameTool`, `georefOverlay` →
  `frameOverlay`, `GEOREF` → `LOCAL_FRAME`, `georef.test.js` → `localFrame.test.js`) and the
  save format string. The computation is unchanged. Reason: the tool fits a local Cartesian frame
  with no CRS, datum or projection, so "georeference" overstated what it does.
- `npm run lint`: no problems. `npm run format:check`: all files pass. `npm test`: 13 files,
  80 tests passed (the same 13 tests, now in `localFrame.test.js`). `npm run build` passes, with
  the same chunk-size warning as before.
- Playwright (Chromium, headless) on `vite preview` with `nugatti_plySH3.ply`, at 1600 × 900 and
  390 × 844: the tool shows as "Scale & coordinate system" with both methods, the word
  "georef" appears nowhere in the page text, no horizontal page overflow, no console errors.
  Screenshots at both widths were looked at.
- Not verified again: picking, fitting and Save/Load in the browser (the logic is unchanged and
  covered by the unit tests). A JSON saved before the rename is rejected as "not a saved
  coordinate system"; this was read from the code, not tried in the browser.

2026-11-05, georeference tool (test file later renamed to `localFrame.test.js`):

- `npm run lint`: no problems. `npm run format:check`: all files pass. `npm test`: 13 files,
  80 tests passed. New: `georef.test.js` with 13 tests:
  - the eigen-solver satisfies A v = λ v;
  - quaternion rotation matches three.js;
  - a known transform (scale 2.5, 40° about a tilted axis, a 6 000 000 / 500 000 / 120 offset)
    is recovered with RMSE < 10⁻⁶;
  - exactly 3 points work;
  - with noise of about 0.01–0.02, the RMSE is between 0.001 and 0.03 and the residuals sum to 0;
  - your origin and axes map back correctly;
  - too few, incomplete and collinear points are rejected;
  - scale from a distance;
  - levelling turns your +Z into screen up;
  - the angle and axis are reported correctly;
  - JSON round trip and rejection of bad files.

  `format.test.js` also checks that −0.000 is now shown as 0.000. `npm run build` passes.

- Playwright (Chromium, headless) on `vite preview` with `nugatti_plySH3.ply`, at 1600 × 900:
  - _Known distance:_ two picks 0.958 units apart, a real length of 12 cm → "1 file unit =
    12.526 cm". Measuring the same two screen points then gave "Distance: 12.000 cm". The extent
    showed as 23.761 × 19.474 × 19.702 cm (file axes).
  - _Exclusive picking:_ with Measure active, "Pick 2 points" turned Measure off.
  - _Known coordinates:_ 4 points were picked; one burlap edge missed and the next screen point was
    used. Their file coordinates were read from a saved JSON. Target coordinates were made from a
    chosen transform in Node with three.js: scale 6 cm per unit, R = Rz(30°)·Rx(−90°) (file −Y up
    → your +Z up), and the origin at point 4. The app returned scale 6.000 cm, rotation 93.84°
    about (−0.935, −0.251, 0.251), and origin (−0.713, 2.527, 0.308) file units. All three equal
    the values computed from the chosen transform. RMSE 0.000 cm and all residuals 0.000. The
    view levelled with the cup upright, O was drawn at point 4, and the blue Z axis pointed up.
  - _Save/Load:_ after a page reload and opening the splat again, loading the saved JSON gave the
    identical result text.
  - At 390 × 844 the loaded georeference showed the table with all columns, the markers and the
    axes, and there was no horizontal page overflow. No console errors.
  - Screenshots at both widths were looked at. At first the control-point table overflowed the
    300 px panel; its columns were then fixed.
- Not verified: real-world accuracy. That needs lengths or coordinates measured on the real cup
  and table; the numbers above only show that the computation is correct. Also not verified:
  projected coordinates (UTM) in the app, other formats, and the live site.

2026-11-05, ellipsoid view:

- `npm run lint`: no problems. `npm run format:check`: all files pass. `npm test`: 12 files,
  67 tests passed (new: `ellipsoidView.test.js`, 4 tests: Spark's defaults at 0, flat and 1σ at
  1, linear in between, out-of-range and NaN clamped). `npm run build` passes. Vite still warns
  about the chunk size.
- Playwright (Chromium, headless) on `vite preview`, with `nugatti_plySH3.ply` (see
  [Test data](#test-data)). Screenshots at 1600 × 900 and 390 × 844 with the slider at 0, 50 and
  100 % were looked at. At 0 % the render looks as before. At 50 % the splats are denser and
  harder. At 100 % the separate ellipses show: long thin splats on the burlap, flat discs on
  the lid, and large pale floaters around the cup. At 390 px the tool fits the panel and the
  slider spans its width. No console errors at either width.
- PSNR/SSIM stay on the normal render. With `nugatti/dense` opened, "Evaluate IMG_6424.JPEG" gave
  the same numbers with the slider at 0 % and at 100 %: PSNR 5.50 dB whole / 21.92 dB splat area,
  SSIM 0.148 / 0.729, coverage 17.1 %. As a control, a build with the switch-off in
  `renderPhotoNow` removed gave 5.88 dB / 14.51 dB, SSIM 0.102 / 0.345 and coverage 22.9 % at
  100 %. So the switch-off is what keeps the metrics honest. After the evaluation, the pane
  showed the ellipsoid view again.
- Not verified: other formats (SPZ, SOG, .splat, .ksplat) with the slider, frame rate at 100 %,
  and the live site.

2026-11-03, redesign and space background removed:

- `npm run lint`: no problems. `npm run format:check`: all files pass. `npm test`: 11 files,
  63 tests passed (the starfield tests went with the starfield). `npm run build` passes and
  bundles the font files (latin 78.15 kB woff2).
- Playwright on `vite preview` at 1600 × 900 (also 1600 × 3000 to see the whole panel) and
  390 × 844, screenshots looked at, no console errors: the background chips are Navy, Black and
  Sky; of all elements on the empty page, only the "← My GIS module" link has a border radius;
  the panel's scroll width equals its width at 1600 and 390 px. With two panes, linked
  cameras, a photo in Swipe and the Difference view with the pixel readout, no text overlaps:
  the photo label, the colour scale and the readout stay apart, and the pane's own corner marks
  are hidden while the photo frame shows its own. A first pass showed a double rule with a gap
  between the last pane tool and "All panes", and small tick marks in the middle of each pane
  side that read as stray dashes; both were removed.

2026-11-03, COLMAP photos and PSNR/SSIM:

- `npm run lint`: no problems. `npm run format:check`: all files pass. `npm test`: 12 files,
  65 tests passed. New: `colmap.test.js` (synthetic `.bin` and `.txt` files, distorted models,
  folder layouts), `photoCamera.test.js` (a 3D point lands on the same pixel through COLMAP's
  pinhole and through the three.js camera, also letterboxed; C = −Rᵀt; frustum corners; the
  split rule) and `metrics.test.js` (PSNR from its definition, SSIM against a direct
  non-separable implementation, masks, row flip). `npm run build`: 3,539.97 kB of JavaScript
  (1,183.61 kB gzip) plus a 2.30 kB worker.
- The parsers on the real `nugatti/dense/sparse` (Node): 44 images read in 10.0 ms; hold-out 8
  makes IMG_6424, 6432, 6440, 6448, 6456 and 6464 the test photos.
- Playwright on `vite preview` (headless Chromium, `--use-angle=d3d11`) at 1600 × 900 and
  390 × 844, screenshots looked at, no console errors:
  - Opening `nugatti/dense` through the folder input: "dense: 44 photos, PINHOLE
    1539 × 2058 px". Zoomed out, the 44 frustums form a ring around the splat.
  - Choosing IMG_6440: the pane goes to its camera and the photo lines up with the splat in
    Swipe and in Blend at 0.5 (the cup's outline and lettering continue across the swipe line).
    Orbiting removes the overlay. At 390 px the photo fits the narrow pane.
  - The difference image of IMG_6440 is upright and lines up with the photo.
  - For IMG_6424, the render and the photo bytes were saved from the page (temporary debug code,
    removed again) and looked at: same pose, same framing.
- Results, "Evaluate all photos" on each export, hold-out set to 8 only to exercise the split
  (the models were trained on all photos, so all 44 are training views). Means over all 44
  photos from the downloaded CSVs:

  | Export   | PSNR (dB) | SSIM  | PSNR\* (dB) | SSIM\* | Coverage | Time    |
  | -------- | --------- | ----- | ----------- | ------ | -------- | ------- |
  | PLY SH 1 | 5.14      | 0.116 | 21.12       | 0.695  | 14.0 %   | 88.8 s  |
  | PLY SH 2 | 5.14      | 0.120 | 21.26       | 0.721  | 14.0 %   | 100.7 s |
  | PLY SH 3 | 5.14      | 0.122 | 20.99       | 0.732  | 14.0 %   | 102.5 s |
  | SOG SH 3 | 5.13      | 0.121 | 21.10       | 0.730  | 13.9 %   | 97.7 s  |

  \* only pixels with render alpha ≥ 0.5. Time: the app's own timing for all 44 photos, in
  headless Chromium on this machine (before pipelining render and comparison, the SH 3 PLY
  took 136.3 s).

- What the numbers say: the whole-photo PSNR of about 5 dB is no measure of quality here,
  because the splat is cropped and covers only 14 % of each photo; the rest is black against
  the room. Inside the splat area, SSIM rises with the SH degree (0.695 → 0.721 → 0.732) and
  the SOG is close to the PLY with the same degree (0.730 against 0.732), while PSNR stays
  around 21 dB for all. For fully covered pixels of IMG_6424 (alpha ≥ 250/255), the render was
  on average brighter than the photo: mean R, G, B 138.9, 91.9, 81.8 against 132.6, 78.9, 71.2.
  Why is **not verified**: possible causes are the crop (splats behind the surface were removed),
  an exposure or appearance model in training, or a colour-handling difference between
  LichtFeld Studio and Spark. Comparing with the PSNR that LichtFeld Studio reports for the
  training images would tell; that was not done.
- Panel, tools and photo list (2026-11-03): Playwright at 1600 px (also a 3200 px tall window,
  to see the whole panel) and 390 px, screenshots looked at, no console errors.
  - Dragging the handle gave panel widths of 264, 304 and 524 px, with the panes starting
    8 px right of the panel's edge each time (panel at x = 16 px); ArrowLeft on the handle took 524 to 508. At 390 px the
    handle is hidden (bottom sheet).
  - The panel's scroll width equals its width at all three widths (nothing sticks out
    sideways). The first check found the hidden histogram table widening the panel by 57 px at
    264 px (a table ignores a 1 px width); it now sits in a hidden `<div>`. In the screenshots
    no text overlaps; at 264 px the chips and the hold-out label wrap onto more lines, and the
    tables keep their headers on one line (they can scroll sideways).
  - All six tools close and open; with four panes, the three empty panes no longer show the
    ring of camera frustums around them (it is drawn only around a splat).
  - The photo-list bug: React marks the first option as selected when the value matches no
    option, so a first click on IMG_6424 changed nothing. The list now starts with "Free view
    (no photo)". A real mouse click on IMG_6424 shows the photo at once; after orbiting away, a
    click on the same (still highlighted) photo returns to it; "Free view" leaves the photo
    view; → from Free view goes to the first photo.
- One photo in detail (2026-11-03, after the batch run above): `npm test` 12 files, 68 tests
  (new: error histogram, its summary statistics, signed offset). Playwright at 1600 × 900 and
  390 × 844 with the SH 3 PLY, screenshots looked at, no console errors:
  - "Evaluate IMG_6424.JPEG" took 4.0 s (3.6 s at 390 px) and gave PSNR 5.50 dB whole and
    21.92 dB splat area, SSIM 0.148 and 0.730, coverage 17.1 %: the same as the batch CSV row
    for that photo. Colour offset over the splat area: R +3.5, G +13.4, B +14.7 levels (render
    brighter). Error in the splat area: mean 6.1 %, median 5.1 %, 95th percentile 14.9 %,
    16.4 % of pixels at 10 % or more; whole photo: mean 44.2 %, median 53.7 %, 80.6 % of
    pixels at 10 % or more (the cropped-away room).
  - Hovering the 5–6 % bar: "11.04 % of pixels (59 744)".
  - Hovering the difference image on the cup: pixel 677, 1070, render 200 160 160, photo
    221 150 156, error 4.6 % (by hand: (21 + 10 + 4) / 3 = 11.7 levels = 4.6 %). At 390 px the
    readout stays inside the pane.
- **Not verified:** a model trained with held-out test photos (so no real novel-view numbers
  yet), the `.txt` model format and `sparse/0` layouts on real data (unit tests only), SSIM
  against a reference implementation such as the 3DGS repository's (only against a direct
  implementation of the same formula), real phones, Firefox and Safari (`createImageBitmap`
  options and `OffscreenCanvas` are needed), and the evaluation with several panes at once.

2026-11-03, tiled panes, linked cameras and backgrounds:

- `npm run lint`: no problems. `npm run format:check`: "All matched files use Prettier code
  style!" `npm test`: 9 files, 40 tests passed (new: `layout.test.js` for split, close, divider
  clamping and the flat layout, and `stars.test.js`, which checks that the stars are spread
  evenly on the sphere: mean |y| close to 1/2 and about 13.4 % of them above 60° latitude).
  `npm run build`: one JS file of 3,517.34 kB (1,175.85 kB gzip).
- Playwright on `vite preview` (headless Chromium, `--use-angle=d3d11`) at 1600 × 900 and
  390 × 844, with the screenshots looked at, and no console errors in any run:
  - Split to four panes (Pane 1 | Pane 2 over Pane 3 | Pane 4); the split buttons are disabled at
    four. The SH 1, SH 2 and SH 3 PLY and the SOG opened in one pane each, and all four render.
  - Dragging the middle divider 250 px changed the canvas widths from 626/626 px to 871/381 px
    (`aria-valuenow` 69); ArrowLeft on the focused divider gave 64.
  - Clicking Pane 3 showed its file (`nugatti_plySH3.ply`) in the panel and "Open splat file in
    Pane 3". Closing Pane 2 kept the other three splats and their numbers (1, 3, 4); the next
    split was numbered Pane 2 and became active.
  - Linked cameras, compared by screenshots of Pane 2's canvas: with nothing moving, two shots
    1 s apart are identical; unlinked, orbiting Pane 1 leaves Pane 2 unchanged; turning the link
    on and orbiting Pane 1 changes Pane 2 to the same view; unlinked again, Pane 2 stays.
  - Each background chip is pressed in turn and the screenshots show navy, black, sky (blue
    zenith, haze at the horizon, ground below) and the starfield with the Milky Way band. In
    three runs, the click plus a fixed 0.8 s wait took 0.85–0.98 s for navy, black and sky and
    1.48–1.72 s for space, chosen for the first time on the page (two panes). So drawing the
    starfield canvas takes in the order of 0.7–0.9 s here; this is a rough timing, not a
    benchmark.
  - With the sky and +Z as up axis, the splat tilts while the horizon stays level.
  - Measuring in Pane 2 gave "Distance: 0.457 units" with both markers visible.
  - At 390 px, the split panes stack vertically, the bottom sheet shows the active pane's facts,
    and the space background renders in both panes.
- **Not verified:** frame rate and memory with four panes, real phones, Firefox and Safari, a
  screen reader with the panes and dividers, drag and drop onto a pane with a real drag (only
  the file inputs were used), and files larger than 36 MiB in several panes.

2026-10-28, after the rebuild:

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

A **space background** (2026-11-03) was removed the same day at the user's request. It was a
starfield on an equirectangular canvas, with the stars spread evenly over the sphere (height y
uniform in [−1, 1], by Archimedes' hat-box theorem) rather than evenly in the image, which would
crowd them at the poles: the same area distortion of the plate carrée projection as in Project 1.
Its code (`utils/stars.js`, `tests/stars.test.js`) is in git history at commit `6373519`.

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

Speed (2026-11-06): "Evaluate all photos" on the 44 nugatti photos dropped from ≈ 125–170 s
to 19.4 s on this machine, with identical results. Idle panes no longer redraw (0 draw calls
in 5 s instead of 601 per pane). See [Verification](#verification).

Rename (2026-11-05): the georeference tool is now "Scale & coordinate system", since it
assigns a local frame, not a CRS. See [Verification](#verification).

Georeference tool (2026-11-05): scale from a known distance, or a least-squares similarity
transform from 3 or more control points in your own frame, with residuals, a levelled view, the
drawn origin/axes and JSON save/load. See [Verification](#verification).

Ellipsoid view (2026-11-05): a per-pane slider from the normal render to opaque splats cut at
their 1σ ellipse, to show how the Gaussians are spread. See [Verification](#verification).

Redesign (2026-11-03): square sidebar layout with fiducial-marked views, the homepage's display
font, and the space background removed. See [Verification](#verification).

COLMAP photos and metrics (2026-11-03): the cameras of the capture as frustums, photo view at
each photo's exact camera with swipe, blend and difference, a train/test hold-out setting, and
PSNR/SSIM per pane with CSV export. See [Verification](#verification).

Tiled comparison and backgrounds (2026-11-03): up to four panes with draggable dividers, linked
cameras, and navy, black, sky and space backgrounds (space removed later, see
[History](#history)). See [Verification](#verification).

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

NTNU design (2026-10-28): the panel is white with navy text and NTNU-blue buttons, chips and
switches, like the module homepage. The 3D stage behind it is NTNU navy: the renderer clears to
`BACKGROUND` in `config.js` with
[`WebGLRenderer.setClearColor`](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setClearColor),
and the empty state and drop overlay use light text on it (since 2026-11-03 the colour is the
`navy` entry of `BACKGROUNDS`, set as `scene.background`). The measurement markers stay orange,
so they stand out on any splat. Computed with the WCAG formula, the panel over the navy stage
gives 13.0:1 for normal text, 5.8:1 for muted text and 7.1:1 for NTNU blue. The light text of the
empty state has 10.1:1 on navy. Lint, format check, tests (26) and build pass, and screenshots at
1600 and 390 px (empty state and the SOAR splat open) were inspected.
