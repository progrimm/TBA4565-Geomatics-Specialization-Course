# Project 3, 3DGS Viewer: report evidence

Collected 2026-10-29 by the `report-evidence` skill at commit `10dcd34` (branch `sprint`, `Project 3/` clean). Source material, not prose.

Markers:
- **[re-run]**: confirmed by running code on 2026-10-29 on the development machine (Windows 11, Node 24.20.0). Two scratch scripts in the session scratchpad, not committed:
  - `soar-check.mjs` reads the SOAR PLY (extracted with `git show 2d4ca2b:"Project 3/public/splats/soar.ply"`) and runs the project's own `src/utils/ply.js`, `bounds.js` and `format.js` on the raw float32 centres. No Spark.
  - `soar-browser.cjs` uses Playwright 1.64.1 (Project 3 devDependency) with headless Chromium 156.0.8078.4 and `--use-angle=d3d11`. It opens the same file three times in the built app (`vite preview`) at 1600 × 900 and reads the facts panel.
- **[docs]**: taken from `README.md`, `CLAUDE.md` or commit messages and not re-run.
- **UNVERIFIED**: could not be confirmed.

Paths are relative to `Project 3/` unless they start with `.github/`, `report/`, `site/`, `scripts/` or `../`.

## 1. Objective and motivation

- Purpose: a static web app for opening your own 3D Gaussian splat file (`.ply`, `.spz`, `.splat`, `.ksplat`, `.sog`) and inspecting it in the browser with Spark on three.js. The file is read in the browser and never uploaded. (`README.md` L3–6)
- Report question: "what does a 3DGS file contain, and how well can a static web page open and inspect it entirely on the client?" (`README.md` L13–14; `CLAUDE.md` §About this project)
- Homepage framing: "What can you learn from a 3D Gaussian splat file without uploading it anywhere?" (`site/index.html` L130)
- Course framing: Project 3 is the "3D GIS" project of the module. (root `CLAUDE.md`; `report/SPRINT.md` L9)
- History of the objective:
  - The project was split out of Project 2 on 2026-10-27 (commit `abd91eb`). It first had a CesiumJS globe gallery of four georeferenced splats and a "Viewer lab" benchmark (commits `b6a13b2` to `9442d81`).
  - On 2026-10-28 it was rebuilt as a local-file viewer (commit `2f69795`). Reason: the gallery's ion assets needed Cesium's evaluation token (the project's own token got 404), the iTwin share key expires on 2026-12-01, and Esri's sample states no licence. (`README.md` §History)
- Outdated doc: `report/SPRINT.md` L9 and L144–180 still describe Project 3 as the gallery plus Viewer lab. The current scope is the file viewer. (`README.md` §History; root `CLAUDE.md`)
- Who benefits: **missing** as an explicit statement. The implied users are people with their own splat files (for example 3DGS training output or SuperSplat exports) who want to inspect them without uploading. This is my inference from `README.md` L58–60 and L18–23.
- Scope rule: "Do NOT add features beyond this list without asking". The list is: open a file, file facts, orientation fix and reset, two-point distance and the homepage link. (`CLAUDE.md` §Features)

## 2. GIS concepts

The GI Science / GI Systems / 3D GIS classification is my judgement. The course labels Project 3 as a whole "3D GIS".

- **3D Gaussian splatting as a 3D scene representation.** Each splat has a mean position, a covariance (scale per axis plus a rotation quaternion), an opacity and spherical-harmonic (SH) colour. Rendering projects each Gaussian to a 2D splat, sorts by depth and alpha-blends. The app reads these properties from the PLY header and reports them. GI Science (3D representation). (`README.md` §Background; `src/utils/ply.js` L1–5)
- **Splats vs meshes vs point clouds.** A mesh has explicit surface topology, a point cloud has surface samples without extent, and a Gaussian has extent, orientation and opacity, fitted with a photometric loss. In the app, a PLY without `scale_*`, `rot_*`, `opacity` and `f_dc_*` is rejected as "a mesh or a plain point cloud". GI Science. (`README.md` §Background; `src/utils/ply.js` `REQUIRED_SPLAT_PROPERTIES`; `src/hooks/useSplatViewer.js` L90–97)
- **Spherical harmonics, view-dependent colour.** The SH degree is derived from the count of `f_rest_*` properties: f_rest = 3((d+1)² − 1), so degree 3 has 45. GI Science (3D graphics theory). (`src/utils/ply.js` `shDegree`; `tests/ply.test.js`)
- **Local (arbitrary) coordinate frame vs a CRS; georeferencing.** A splat from structure from motion (SfM, e.g. COLMAP) has an unknown origin, orientation and often scale. The viewer shows the file's own frame and units and does no georeferencing. Tying the splat to a CRS would need GNSS camera positions or ground control points. GI Science. (`README.md` §Background "Georeferencing, and what this viewer does not do"; `src/viewer/splatViewer.js` typedef `SplatStats`)
- **Up-axis conventions (COLMAP −Y up vs GIS/CAD +Z up), frame rotation by quaternion.** The user picks +Y, −Y, +Z or −Z. All four are rotations about x, applied to a parent `THREE.Group`, so picked points stay in file coordinates. The default is −Y. GI Science (reference frames), implemented in GI Systems. (`src/utils/orientation.js`; `src/config.js` `UP_AXES`, `DEFAULT_UP_AXIS`; `tests/orientation.test.js`)
- **Scale ambiguity and units.** Distances and extents are in "file units", metres only if the capture was scaled. GI Science (measurement and metric quality). (`src/utils/format.js` `formatLength`; `src/components/SplatFacts.jsx` note; `README.md` §Features)
- **Robust extent / outlier handling (quantile bounding box).** The camera frames the central 96 % of splat centres per axis (the 2 % and 98 % quantiles), not the full box, so floaters do not push the camera away. Clouds are sampled to at most 500 000 centres. GI Science (spatial statistics). (`src/utils/bounds.js` `coreBounds`; `src/config.js` `CORE_FRACTION`, `CORE_MAX_SAMPLES`)
- **3D picking by raycasting; Euclidean 3D distance.** A three.js `Raycaster` through the pointer hits the nearest splat ellipsoid (Spark's `SplatMesh.raycast`). The distance is `Math.hypot` of the coordinate differences in file coordinates. GI Systems (3D interaction) and GI Science (measurement). (`src/viewer/splatViewer.js` `pick`; `src/utils/measure.js`)
- **Camera framing (bounding sphere in a perspective frustum).** distance = radius / sin(fov/2), with near and far planes as 0.001× and 100× that distance. GI Systems (3D visualisation). (`src/utils/bounds.js` `cameraForBounds`; `src/config.js` `CAMERA`)
- **3D data formats and compression (PLY, SPZ, SOG, .splat, .ksplat, compressed PLY).** Formats are recognised by extension. Compressed PLY (`packed_position`) is recognised from the header and passed to Spark. GI Systems (data formats and interoperability). (`src/config.js` `FORMATS`; `src/utils/splatFile.js`; `src/utils/ply.js`; `README.md` §Background "File formats")
- **3D Tiles + glTF `KHR_gaussian_splatting` (context only, not implemented).** This is the way to stream georeferenced splats onto a globe with a root transform, as CesiumJS does. The viewer reads single local files only. GI Systems. (`README.md` §Background; §Limitations "One file at a time")
- **Client-side processing and static hosting.** There is no server and no token. The file is read with `File.arrayBuffer()` and the app is deployed on GitHub Pages under a sub-path (Vite `base: './'`). GI Systems (architecture). (`README.md` §Features; `vite.config.js`; `src/hooks/useSplatViewer.js`)

## 3. Data

- **The app ships no data.** Users open their own files. (`README.md` §Test data)
- **Test dataset: "SOAR Telescope" splat by Luis Cerda.**
  - Source: <https://github.com/khyron/Gaussian-Splatting>, release 1.0 (<https://github.com/khyron/Gaussian-Splatting/releases/tag/1.0>). Licence: CC BY 4.0. Content: the SOAR telescope on Cerro Pachón, Chile. (`git show 2d4ca2b:"Project 3/public/splats/ATTRIBUTION.md"`; `README.md` §Test data)
  - Original: SuperSplat compressed PLY `soar.compressed.ply`, 12,273,900 bytes, SHA-256 `0f78dc6e…159842` [docs, from ATTRIBUTION.md at `2d4ca2b`; original file not re-checked].
  - Preprocessing: format conversion only, with `npx @playcanvas/splat-transform@3.10.3 soar.compressed.ply soar.ply` [docs, ATTRIBUTION.md at `2d4ca2b`].
  - Converted file: 47,262,365 bytes, SHA-256 `caeb8fc5c819895c787a46b67600d3dafd46164317c413d8c769acc4e53fced7` [re-run, `soar-check.mjs`: hash and size match].
  - Format: `binary_little_endian 1.0`, `element vertex 200258`, 59 float properties (x y z, rot_0..3, scale_0..2, opacity, f_dc_0..2, f_rest_0..44), header 1,477 bytes. Header + 200,258 × 59 × 4 bytes = 47,262,365 bytes, which matches the file exactly. [re-run]
  - CRS: none. The frame is the arbitrary SfM frame, and +y points down ("The test file has +y pointing down"). (`README.md` §Background)
  - Quality issues: floaters. The full centre box is 1.261× / 1.209× / 1.134× the core box in x/y/z [re-run]. NaN centres: none (finite count = vertex count = 200,258) [re-run].
  - Status: committed in `2d4ca2b`, removed from the repo in `2f69795`. It is not on the site. It was loaded from git history only for the homepage screenshot. (`README.md` §Status; `site/index.html` L170–175 credits it)
- Earlier gallery data (three Cesium ion assets, one Bentley iTwin tileset, an Esri sample) was dropped. It is in history at `9442d81`, not used now. (`README.md` §History)
- Untracked `nugatti_plySH3.ply` in the repo root: not referenced anywhere in Project 3. Not examined. (`git status`)

## 4. Architecture and stack

- Stack: Vite 8.3.5 + React 19.3.1 (JS/JSX), Spark (`@sparkjsdev/spark`) 2.4.0 (MIT) on three.js 0.186.1 (pinned), ESLint 10, Prettier 3.9, Vitest 5.0.5, Playwright 1.64.1 (dev). (`package.json`; installed versions checked with `node -p require(...)` [re-run])
- The engine stays out of React. `viewer/splatViewer.js` owns the three.js objects and exposes `load`, `resetView`, `setUpAxis`, `pick`, `setMarkers` and `dispose`. The hooks keep only UI state. (`README.md` §Project Structure; `src/viewer/splatViewer.js`)
- The PLY header is parsed from the same bytes before Spark gets them, both for the facts and to reject non-splat PLYs with a clear message. (`src/hooks/useSplatViewer.js` L87–98)
- The splat and the markers sit in one `THREE.Group`, so the up-axis rotation applies to both and measurements survive orientation changes. (`src/viewer/splatViewer.js` L73–82)
- Markers are `Sprite`s with `sizeAttenuation: false`, `depthTest: false` and `renderOrder = 1`, so they draw after Spark's transparent pass. (`src/viewer/splatViewer.js` L170–220)
- Deployment: the root `npm run site:build` (`scripts/build-site.mjs` L27) builds the app into `dist-site/3dgs-viewer/`, and `.github/workflows/pages.yml` publishes it. Live: <https://progrimm.github.io/TBA4565-Geomatics-Specialization-Course/3dgs-viewer/> [docs, `README.md` §Status].

```mermaid
flowchart LR
  U[User: file dialog or drag and drop] -->|File| FO[useFileOpener]
  FO -->|File| SV[useSplatViewer.open]
  SV -->|extension| SF[utils/splatFile: FORMATS check]
  SV -->|File.arrayBuffer to Uint8Array| PLY[utils/ply: parsePlyHeader, PLY only]
  PLY -->|missing props: error| MSG[state/messages to Messages UI]
  SV -->|bytes, fileName| V[viewer/splatViewer.load]
  V --> SM[Spark SplatMesh fileBytes]
  SM -->|forEachSplat centres| B[utils/bounds: collect, full, core, cameraForBounds]
  B --> CAM[PerspectiveCamera + OrbitControls]
  SM --> G[THREE.Group model, up-axis quaternion]
  G --> R[SparkRenderer + WebGLRenderer, canvas]
  V -->|SplatStats| FACTS[SplatFacts panel]
  PLY -->|header| FACTS
  OT[OrientationTool] -->|setUpAxis| G
  MT[useMeasurement] -->|pick: Raycaster + SplatMesh.raycast| V
  MT -->|points| MK[markers Sprites + Line in model group]
  MT -->|utils/measure.distance| MTUI[MeasureTool: distance in file units]
  subgraph Browser only, no server
    FO
    SV
    V
  end
```

## 5. Methods and workflow

1. Install and run (from `Project 3/`): `npm ci`, then `npm run dev`. Open the Vite URL and open a splat file. (`README.md` §Getting Started)
2. Check the format by extension (`splatFormat`). An unsupported extension gives an error message. (`src/hooks/useSplatViewer.js` L71–78)
3. Read the whole file into memory with `File.arrayBuffer()`. Timing starts before this. (`src/hooks/useSplatViewer.js` L83–86)
4. PLY only: parse the header, compute the SH degree and detect compressed PLY. Reject the file if required splat properties are missing. (`src/utils/ply.js`)
5. Create `new SplatMesh({ fileBytes, fileName })` and await `initialized`. On error, dispose it and keep the previous splat. (`src/viewer/splatViewer.js` `load`)
6. Collect the finite centres (two passes over `forEachSplat`, skipping NaN), then compute the full bounds and the core bounds (96 % per axis, ≤ 500 000 samples). (`src/utils/bounds.js`)
7. Frame the camera on the core bounds after the current up-axis rotation. (`resetView`)
8. Show the facts: name, format, size (MiB), splat count, core and full extent, load time (s), and for PLY the encoding, SH degree and property count. (`src/components/SplatFacts.jsx`)
9. Optional: choose the up axis (+Y/−Y/+Z/−Z), Reset view, and measure two points (left click, 5 px drag tolerance, Escape stops). (`src/components/OrientationTool.jsx`; `src/hooks/useMeasurement.js`)
10. Reproduce the SOAR facts: `git show 2d4ca2b:"Project 3/public/splats/soar.ply" > soar.ply`, then `npm run build`, `npm run preview`, and open `soar.ply`.
11. Build the whole site (repo root): `npm run site:install`, `npm run site:build`, `npm run site:preview`. (root `package.json`)

## 6. Results

- **SOAR file facts in the built app** [re-run, `soar-browser.cjs`, three fresh pages, identical facts each time, 0 console errors]:
  - Size 45.1 MiB; splats 200 258; PLY encoding `binary_little_endian 1.0`; SH degree 3; 59 properties per splat.
  - Extent (core, 96 %): 7.303 × 3.438 × 9.494 units. Full extent: 9.209 × 4.154 × 10.770 units.
  - These match `README.md` §Verification exactly.
- **Opened in** (time from file read through Spark init and centre collection): 0.26 s, 0.27 s, 0.25 s [re-run, three runs, headless Chromium with `--use-angle=d3d11`, this machine]. The README reports 0.24–0.27 s [docs]. This is a single-machine, headless figure, not a benchmark.
- **Floaters**: full / core extent = 1.261 (x), 1.209 (y), 1.134 (z), so floaters add about 26 % in x, as the README says [re-run, `soar-check.mjs` on raw float32].
- **Precision note**: the project's helpers on raw float32 centres give core 7.302 × 3.437 × 9.495 and full 9.208 × 4.155 × 10.769. That is ±0.001 from the in-app values, which use Spark's `forEachSplat` centres [re-run]. Likely cause: Spark's reduced-precision packing (Spark exports `toHalf`/`fromHalf`). The cause is UNVERIFIED.
- **Two-point distance** "2.573 units" (two clicks on the hillside) [docs, `README.md` §Verification]. UNVERIFIED: it depends on manual click positions and was not re-run.
- **Error handling** [docs, `README.md` §Verification; not re-run]:
  - `.txt` gives "not a supported splat file".
  - An ASCII PLY with only x y z gives "no Gaussian splat properties (missing scale_0 …)".
  - A PLY truncated to 5,000 bytes gives Spark's "Expected 200258 splats, got 14".
  - In each case the open splat stays.
- **Bundle size** [re-run, `npm run build` 2026-10-29]:
  - JS 3,496.10 kB (gzip 1,168.17 kB), CSS 7.36 kB (gzip 2.09 kB), `index.html` 0.65 kB. `dist/` is 3.4 MB (`du -sh`).
  - Vite warns about chunks > 500 kB.
  - The README's Verification section gives 3,496.05 / 1,168.14 kB, measured before the NTNU design commit `10dcd34`. Its design section gives 3,496.1 / 1,168.1 kB, consistent after rounding.
- **No Cesium left**: `grep -rlE "cesium|itwin|ion.cesium"` over `src/`, `index.html` and `dist/` found no match (exit 1) [re-run].
- **WCAG contrast** [re-run, WCAG 2 relative-luminance formula over `src/style.css` tokens]:
  - The panel is white at 94 % over navy `#0f2a47`, which gives rgb(241,242,244).
  - Text `#0f2a47` 13.0:1; muted `#44607f` 5.8:1; accent `#00509e` 7.1:1.
  - Empty-state text `--stage-muted` `#c9d9ec` on navy 10.1:1; white on navy 14.6:1.
  - All match the README. They ignore the backdrop blur over a bright splat behind the panel.
- Old gallery and Viewer-lab results (alignment offsets, gallery performance, viewer benchmark CSVs) exist only in git history at `9442d81` (`results/*.csv`). They were not re-run and are not quoted here.

## 7. Verification

- `npm --prefix "Project 3" run lint`: exit 0, no output problems [re-run].
- `npm --prefix "Project 3" run format:check`: "All matched files use Prettier code style!" [re-run].
- `npm --prefix "Project 3" test`: Vitest 5.0.5, 7 files, 26 tests passed [re-run]. The tests cover the pure helpers and the message store:
  - `tests/bounds.test.js`: NaN skipping, full box, core box ignores floaters, sampling, camera distance, non-zero distance for a single point.
  - `tests/ply.test.js`: 3DGS header, CRLF, plain point cloud lists missing properties, SuperSplat compressed PLY, non-PLY rejection, SH degree.
  - `tests/orientation.test.js`: each axis maps to +y (`it.each`), unit quaternion, unknown axis.
  - `tests/splatFile.test.js`, `tests/measure.test.js`, `tests/format.test.js`, `tests/messages.test.js`.
- Not unit-tested: `viewer/splatViewer.js`, the hooks and the components (they need WebGL and the DOM). They are covered only by manual and Playwright browser checks [code inspection].
- `npm --prefix "Project 3" run build`: success [re-run, see §6].
- CI: `.github/workflows/project3-ci.yml` runs `npm ci`, lint, format:check, test and build on Node 24 / ubuntu-latest. Triggers: push to `main` and pull requests touching `Project 3/**` [code]. Pushes to the `sprint` branch alone do not trigger it. A passing run on GitHub is linked in `README.md` §Status (actions run 40763110583/40763110560) [docs, not re-checked].
- Browser checks:
  - [re-run] Playwright at 1600 × 900, three loads of the SOAR PLY, 0 console errors. Screenshot (scratchpad `soar-1600.png`, not committed) inspected: the telescope renders upright with −Y up, the facts panel is filled and the "← My GIS module" link is present.
  - [docs] All other browser checks are from 2026-10-28 and were not re-run: 390 × 844 layout, drag and drop with synthetic `DragEvent`s, arrow-key navigation (`scrollY` stays 0), the +Z chip, measurement, tab order, right click ignored while measuring, and Escape behaviour. Also the site round trip (homepage → viewer → homepage) at 1600 and 390 px, locally and on the live site. (`README.md` §Verification, §Status)
- `/code-review` (medium) found 10 issues, which were fixed in `501f5a4` [docs, `README.md` §Verification; commit `501f5a4` stats].
- Not verified (per the docs): compressed PLY in the browser, SPZ / .splat / .ksplat / SOG, real phones, Firefox, Safari, a screen reader, files much larger than 47 MB, and opening a file on the live site. (`README.md` §Verification, §Status)

## 8. Limitations, assumptions and uncertainties

Acknowledged in the docs (`README.md` §Limitations unless noted):
- Memory: the whole file is in memory, plus Spark's packed copy. There is no app-level size limit, and only a 47 MB (45.1 MiB) file was tested.
- One file at a time. Multi-file SOG (`meta.json` + images) and 3D Tiles tilesets cannot be opened.
- No real-world frame or scale. Distances are in file units, and the up axis can only be changed in 90° steps about x.
- Measurement accuracy: a pick hits the nearest splat ellipsoid, not a surface, and semi-transparent floaters can be hit first. (`README.md` §Background, §Limitations)
- Formats: only plain PLY was tested in a browser. Compressed PLY is recognised in unit tests only, and the other four formats rely on Spark's loaders, untested here.
- Bundle: 1,168 kB of gzipped JS before the first file can open. Code-splitting Spark was not tried.
- Accessibility: picking measurement points needs a pointer and is not keyboard-accessible. (`README.md` §Accessibility)

Spotted in the code (my observations, not in the docs):
- Format detection is by file extension only. Non-PLY files get no content check before Spark, so a mislabelled file fails inside Spark. (`src/utils/splatFile.js`; `src/hooks/useSplatViewer.js`)
- "Extent" is the box of splat **centres**. It ignores each Gaussian's own scale, so the visual extent is somewhat larger. (`src/viewer/splatViewer.js` `SplatStats` typedef; `src/utils/bounds.js`)
- The core bounds use independent per-axis quantiles. The resulting box can contain fewer than 96 % of splats overall. The UI tooltip correctly says "per axis". (`src/utils/bounds.js` `coreBounds`; `src/components/SplatFacts.jsx`)
- Core-bounds sampling (`CORE_MAX_SAMPLES` 500 000) takes every n-th splat in file order. This is only an approximation for files above 500 000 splats, and not tested on such a file (the SOAR file has 200 258, so no sampling).
- "Opened in" includes the file read, header parse, Spark init and centre collection, but not the first render or sort. It measures load latency, not rendering performance. (`src/hooks/useSplatViewer.js` L83–104)
- In-app centres differ from raw float32 by ~0.001 units on SOAR (§6). Spark's internal precision may also quantise picked points. UNVERIFIED.
- `renderer.setPixelRatio(window.devicePixelRatio)` with no cap. The performance cost on high-DPR phones was not measured. (`src/viewer/splatViewer.js` L61)
- The PLY header search stops after 64 KiB (`MAX_HEADER_BYTES`). Larger headers are reported as "not a PLY file". (`src/utils/ply.js`)
- SH degree is "unknown" for compressed PLY (its SH is in a separate element). (`src/utils/ply.js`)
- CI does not run on pushes to non-main branches without a PR. (`.github/workflows/project3-ci.yml`)
- `report/SPRINT.md` still describes the dropped gallery and Viewer lab. (`report/SPRINT.md` L9, L144–180)

## 9. Future work

- No explicit future-work section in the README or CLAUDE.md: **missing**. The following items come from the stated limitations and "not verified" lists (`README.md` §Limitations, §Verification):
  - Test SPZ, .splat, .ksplat, SOG and compressed PLY files in the browser.
  - Test on real phones, Firefox, Safari, a screen reader, and files much larger than 47 MB.
  - Code-split Spark to reduce the initial download ("Code-splitting Spark was not tried").
  - Support multi-file SOG or 3D Tiles tilesets (a stated non-capability).
  - Georeferencing with GNSS or GCPs, or `KHR_gaussian_splatting` in 3D Tiles, to get real-world frame and scale (described as what the viewer does not do).
  - Test opening a file on the live site (`README.md` §Status).
- Any new feature needs approval under the scope rule (`CLAUDE.md` §Features).

## 10. References

Linked in the project docs or code:
- Kerbl, B., Kopanas, G., Leimkühler, T., Drettakis, G. (2023). "3D Gaussian Splatting for Real-Time Radiance Field Rendering". *ACM Transactions on Graphics* 42(4). Project page: <https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/> (`README.md` §Background)
- Spark docs: <https://sparkjs.dev/docs/> (`README.md`; `src/config.js`; `src/viewer/splatViewer.js`); Spark site: <https://sparkjs.dev/> (`site/index.html`)
- three.js docs: <https://threejs.org/docs/>
  - `Raycaster`: <https://threejs.org/docs/#api/en/core/Raycaster>
  - `OrbitControls`: <https://threejs.org/docs/#examples/en/controls/OrbitControls>
  - `WebGLRenderer.setClearColor`: <https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setClearColor>
- MDN `Blob.arrayBuffer()`: <https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer> (`README.md`)
- PLY format (Paul Bourke): <http://paulbourke.net/dataformats/ply/> (`src/utils/ply.js`)
- Niantic SPZ: <https://github.com/nianticlabs/spz> (`README.md`)
- PlayCanvas splat formats (SOG): <https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/> (`README.md`)
- GaussianSplats3D (.ksplat): <https://github.com/mkkellogg/GaussianSplats3D> (`README.md`)
- Khronos glTF `KHR_gaussian_splatting`: <https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_gaussian_splatting> (`README.md`, ratification checked 2026-10-28 per README)
- SuperSplat editor: <https://superspl.at/editor> (`README.md`)
- Cesium ion access tokens (reason for the pivot): <https://cesium.com/learn/ion/cesium-ion-access-tokens/> (`README.md` §History)
- React "You might not need an effect": <https://react.dev/learn/you-might-not-need-an-effect> (`src/hooks/useMeasurement.js`)
- Test data: SOAR Telescope by Luis Cerda, <https://github.com/khyron/Gaussian-Splatting>, release 1.0 <https://github.com/khyron/Gaussian-Splatting/releases/tag/1.0>, licence CC BY 4.0 <https://creativecommons.org/licenses/by/4.0/> (`README.md` §Test data; ATTRIBUTION.md at `2d4ca2b`)
- Conversion tool: `@playcanvas/splat-transform` 3.10.3 (npm). URL not given in the docs: **missing**.

Relevant but not linked in the project docs (added here; check before citing):
- COLMAP (SfM, the source of the −Y-up convention mentioned in the README): <https://colmap.github.io/>
- antimatter15 `.splat` web viewer: <https://github.com/antimatter15/splat>
- WCAG 2.1 contrast ratio definition (the formula used for the README's contrast numbers): <https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio>
