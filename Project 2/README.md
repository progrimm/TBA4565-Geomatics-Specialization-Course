# Trondheim Shelter Analysis

A CesiumJS web app that analyses walking access to DSB's public shelters (tilfluktsrom) in
Trondheim, Norway, on a 3D city model: global terrain, OpenStreetMap buildings and the shelters
with click-to-inspect attributes. Called Trondheim 3D until 2026-11-08. The site path stays
`/trondheim-3d/`, so existing links keep working.

It is a learning project for TBA4565 at NTNU. The scope is deliberately small and the focus is
on code quality: linting, tests, error handling and CI.

## Features

- Full-page 3D viewer starting over Midtbyen, with Cesium World Terrain
- Cesium OSM Buildings (3D Tiles), toggleable
- DSB public shelters in Trondheim as ground-clamped points. Click one to see its shelter
  number, capacity and address. The shelter credit includes the date the data was fetched
- Preset camera views: Midtbyen (Torvet), Nidarosdomen (west front) and Bakklandet (the wharf
  row by Gamle Bybro). Each view centres its landmark on screen (see
  [Camera views](#camera-views))
- Nearest shelter: click anywhere on the ground to find the public shelter with the shortest
  **walk** along OpenStreetMap streets and paths. The map draws the route. The panel shows the
  shelter's number, address and capacity, the walking distance and the straight-line distance.
  It also shows the total number of shelters and their total capacity. Routing runs entirely in
  the browser, with no API key and no server (see [Nearest shelter](#nearest-shelter))
- Out of range: a click more than 100 m from the walking network, or on a part of it that reaches
  no shelter, gets a popup ("Outside the walking network" or "No path to a shelter") instead of a
  long straight line (see [Out of range](#out-of-range))
- Building passages: if the route goes through a building (a shopping centre, a station hall, a
  building passage), that building is coloured green in the 3D view and named in the panel (see
  [Building passages](#building-passages))
- "How it works": a side sheet that explains the question, the data (provider, format, CRS,
  date, licence), the GIS concepts in the order a click uses them, the key results of a grid
  analysis and the limitations (see [How it works](#how-it-works))
- A map key in the panel, and a neutral dark design with one blue accent (see
  [Status](#status))
- NN2000 heights from Kartverket's geoid model: the camera targets are stored in NN2000 and
  converted with h = H + N, and a clicked ground point shows its NN2000 height. A terrain check
  compares Cesium World Terrain with Kartverket's 1 m terrain model (see
  [Heights and the geoid](#heights-and-the-geoid))
- Coverage and capacity: SSB's 250 m population grid joined to the shelters' service areas
  from one multi-source Dijkstra. A "Walking distance" layer colours each cell by the walk from
  home to the nearest shelter, and the panel gives the share of residents within 500 m, 1 km and
  2 km and the residents per shelter place (see [Coverage and capacity](#coverage-and-capacity))
- Route check: the app's walks compared with an independent router (OSRM, foot profile) at 209
  test points (see [Route check](#route-check-against-an-independent-router))
- Walking time on slopes: every network node has a height from Kartverket's terrain model, and
  Tobler's hiking function turns slopes into minutes. "Nearest" is the fastest walk, with the
  shortest one shown when it leads elsewhere (see [Walking time on slopes](#walking-time-on-slopes))
- Loading and error messages for every layer. If one layer fails, the rest of the app keeps
  working
- A collapsible control panel that becomes a bottom sheet on mobile. All panel controls work
  with the keyboard, and camera flights respect `prefers-reduced-motion`
- A "← My GIS module" link and the "How it works" button at the top of the panel. They sit
  outside the collapsible body, so they stay visible when the sheet is collapsed on mobile

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

| Command                     | Purpose                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run dev`               | Start the Vite dev server                                                                             |
| `npm run build`             | Production build to `dist/`                                                                           |
| `npm run preview`           | Serve the production build locally                                                                    |
| `npm run lint`              | ESLint, including React hooks rules                                                                   |
| `npm run format`            | Format all files with Prettier                                                                        |
| `npm run format:check`      | Check formatting without writing                                                                      |
| `npm test`                  | Run the Vitest unit tests once                                                                        |
| `npm run test:watch`        | Run Vitest in watch mode                                                                              |
| `npm run data:shelters`     | Re-download the shelter dataset (see [Data](#shelters))                                               |
| `npm run data:network`      | Re-download the walking network (see [Walking network](#walking-network))                             |
| `npm run data:passages`     | Recompute the building passages (see [Building passages](#building-passages-data))                    |
| `npm run analysis:grid`     | Re-run the grid analysis behind "How it works" (see [Grid analysis](#grid-analysis))                  |
| `npm run data:heights`      | Re-sample node heights from the terrain model (see [Walking time on slopes](#walking-time-on-slopes)) |
| `npm run data:geoid`        | Re-cut the geoid model subgrid (see [Heights and the geoid](#heights-and-the-geoid))                  |
| `npm run analysis:coverage` | Re-run the coverage analysis (see [Coverage and capacity](#coverage-and-capacity))                    |

Browser checks and the benchmark are plain Node scripts that use Playwright (see
[Quality checks](#quality-checks)):

| Command                               | Purpose                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `node scripts/check-failed-layers.js` | Block one data request at a time and check the app still works                                      |
| `node scripts/check-accessibility.js` | Tab through the panel at 1600 px and 390 px, operate controls                                       |
| `node scripts/validate-routes.js`     | Compare walks with OSRM foot routes (see [Route check](#route-check-against-an-independent-router)) |
| `node scripts/benchmark-buildings.js` | First-load time and frame rate for two SSE values                                                   |
| `node scripts/check-terrain.js`       | Cesium World Terrain vs Kartverket DTM 1 (see [Heights and the geoid](#heights-and-the-geoid))      |

CI ([`.github/workflows/project2-ci.yml`](../.github/workflows/project2-ci.yml)) runs lint,
format check, tests and build on every push and pull request that touches `Project 2/`.

## Project Structure

```text
src/
  main.jsx        entry point: ion token setup and React root only
  App.jsx         composes hooks and components
  config.js       constants: camera views, asset IDs, data URLs, tileset settings
  env.js          build-time values from .env (the Cesium token), read one key at a time
  viewer.js       Viewer creation and global scene settings
  layers/         plain-JS Cesium loaders, one per layer (no React)
  hooks/          React hooks bridging React and Cesium (viewer lifecycle, layer state)
  components/     React UI: panel, view buttons, layer toggles, map key, "How it works", messages
  content/        text of the "How it works" panel (data sources, concepts, limitations)
  state/          framework-independent message store
  utils/          pure helpers (CRS conversion, camera options, HTML escaping, distances, routing)
scripts/          Node data-prep scripts
tests/            Vitest unit tests and fixtures
public/data/      static datasets (shelters GeoJSON, walking network, building passages)
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

- The app works in WGS84. Longitude and latitude are in degrees. Cesium's heights are
  **ellipsoidal** (h, above the WGS84 ellipsoid). Since 2026-11-08 the app converts between h and
  NN2000 heights (H) with Kartverket's geoid model, h = H + N (see
  [Heights and the geoid](#heights-and-the-geoid)). Until then it used a constant N = 40 m.
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

| View             | Target (OpenStreetMap, via Nominatim)                      | Ground, NN2000 (Kartverket DTM 1 m) | Target H, NN2000 (`config.js`) | N (HREF2025A) | Target h = H + N | Heading / pitch / range |
| ---------------- | ---------------------------------------------------------- | ----------------------------------- | ------------------------------ | ------------- | ---------------- | ----------------------- |
| Midtbyen         | Torvet, relation 4681742: 63.4303661 N, 10.3953233 E       | 9.6 m                               | 9.6 m (ground)                 | 39.373 m      | 48.97 m          | 0° / −45° / 2000 m      |
| Nidarosdomen     | Nidarosdomen, way 417245741: 63.4269308 N, 10.3969145 E    | 13.8 m                              | 33.8 m (ground + 20 m)         | 39.387 m      | 73.19 m          | 90° / −15° / 350 m      |
| Bakklandet       | Nedre Bakklandet, way 22652739: 63.4288329 N, 10.4032895 E | 2.7 m                               | 10.7 m (ground + 8 m)          | 39.367 m      | 50.07 m          | 110° / −20° / 400 m     |
| Whole study area | Centre of the walking network's box: 63.3987 N, 10.4144 E  | 58.1 m (2026-11-08)                 | 58.1 m (ground)                | 39.510 m      | 97.61 m          | 0° / −65° / 20 000 m    |

Coordinates come from the [Nominatim](https://nominatim.openstreetmap.org/) search API
(© OpenStreetMap contributors, ODbL). Ground heights come from Kartverket's height API
(`ws.geonorge.no/hoydedata/v1/punkt`, `dtm1` source, CC BY 4.0). Both were looked up on
2026-10-27. Since 2026-11-08 `config.js` stores the NN2000 target height and
`utils/camera.js` adds N from the geoid model; before, it stored ground + aim + 40 m (50, 74 and
51 m). The targets moved down by 0.8–1.0 m, which the preset screenshots (1600 × 900, crosshair)
do not show: Torvet, the cathedral's west front and Nedre Bakklandet are still under the crosshair.

Checked with Playwright screenshots (a crosshair overlay marks the screen centre) at 1600 × 900
and 390 × 844. Torvet, the cathedral's west front and the Bakklandet wharf row sit under the
crosshair. An earlier Bakklandet target, Gamle Bybro looking south-east, was replaced because
it centred the bridge and left the Bakklandet wharves small at the edge. The Midtbyen view was
also fixed: the old camera stood above Torvet looking north, so the start view showed the
harbour instead of the city centre.

### Nearest shelter

A left click that hits no object (no shelter, building or drawn line) is treated as a click on
the ground. The camera ray through the clicked pixel is intersected with the terrain
([`Globe.pick`](https://cesium.com/learn/cesiumjs/ref-doc/Globe.html#pick)), which gives a WGS84
longitude and latitude. Clicks on shelters still open the InfoBox, and clicks on the sky are
ignored.

**Network analysis (`utils/network.js`).** The walking network is a graph: every OSM node is a
graph node, and every way segment is an undirected edge. Each edge is weighted by its geodesic
length on the WGS84 ellipsoid
([`EllipsoidGeodesic`](https://cesium.com/learn/cesiumjs/ref-doc/EllipsoidGeodesic.html),
Vincenty's method). A click is answered in three steps:

1. **Snapping.** The clicked point is joined to its nearest network node, and each shelter to
   its own nearest node. The shelters are snapped once, when the network loads.
2. **Dijkstra's algorithm** runs from the clicked point's node with all shelter nodes as
   targets. It stops at the first target it reaches, so the result is the shelter that is
   nearest _on foot_. That is not always the one nearest in a straight line.
3. **The walking distance** is the straight connector from the click to the network, plus the
   network path, plus the connector from the network to the shelter.

The route is drawn as a ground-clamped polyline (`clampToGround`) draped on terrain and
buildings. The panel also shows the straight-line geodesic distance for comparison. If the
network fails to load, or no shelter is reachable from the clicked part of the network (for
example on an island), the app falls back to the straight-line nearest shelter.

Why in the browser: GraphHopper was considered and rejected. A routing API needs a key, which
would be public in the static bundle and could exhaust the free daily quota. Precomputing the
network keeps the app static, makes it work on GitHub Pages without secrets, and makes the
algorithm unit-testable.

**Tests.** `tests/nearest.test.js` compares geodesic distances with reference values from
[GeographicLib](https://geographiclib.sourceforge.io/) 2.1.1 (Karney's algorithm), stored in
`tests/fixtures/nearest-shelters.json`. It also checks the textbook WGS84 values for 1° of
longitude on the equator (111 319.4908 m) and the meridian arc from 0° to 1° latitude
(110 574.3886 m). All agree to within 0.5 mm. `tests/network.test.js` uses a hand-made network
(`tests/fixtures/overpass-river.json`): a river with one bridge, where the shelter nearest in a
straight line (≈ 100 m away, across the river) is not the nearest on foot. Its tests check:

- the routed path and its length
- the connectors
- a click on a target node (distance 0)
- unreachable shelters
- decoding of the compact file format

**Measured** (Node 24 on the development machine, `public/data/walking-network.json` from
2026-10-27):

- Parsing the network took 15 ms and building the graph 197 ms (164 294 nodes). Snapping the
  12 shelters took 6 ms. One click took 1–3 ms.
- From Torvet the nearest shelter is no. 6870 either way: 199 m in a straight line, 276 m on
  foot.
- On a 30 × 30 grid of points over the shelters' bounding box, the shelter nearest on foot
  differed from the one nearest in a straight line at 168 of 884 reachable points (19 %). The
  grid includes points in the fjord and river, which snap to the nearest shore. No shelter was
  reachable from 16 of the 900 points. The median ratio of walking to straight-line distance
  was 1.34 and the 90th percentile 1.68.

These timings come from Node, not the browser.

**Browser check** (Playwright, dev server with a personal Cesium token, 1600 × 900 and
390 × 844):

- The panel shows "12 public shelters · 5,268 places in total" and the OSM credit.
- A click at Torvet gave shelter no. 6870, with a 266 m walk and 196 m in a straight line.
- A click near Øya gave shelter no. 30671 (Nedre Bakklandet), with a 1.05 km walk and 844 m in
  a straight line. The drawn route follows the streets and crosses Gamle Bybro.
- Clicking a building opened its InfoBox and did not run the search.
- No console errors.

**Limitations:**

- The network is an OSM snapshot. Missing or wrongly tagged paths change the result.
- One-way rules are ignored, which is correct for pedestrians. Barriers, stairs and opening
  hours are not considered.
- Snapping uses the nearest node, not the nearest point on an edge. The connectors are straight
  lines and can cross buildings or water.
- Two shelters that snap to the same node are merged into the first one.
- Loading adds a 3.5 MB file (1.4 MB gzipped).

#### Out of range

Every walk starts with a straight connector from the click to its nearest network node. Far from
the network that connector stops being a walk: the network only covers the shelters' bounding
box plus about 1 km, and clicks in the fjord, the river or a large field snap to a node hundreds
of metres away. `findWalkInRange` (`utils/network.js`) therefore refuses a click when:

- the connector is longer than `NEAREST.maxConnector` = 100 m (geodesic, `config.js`), or
- no shelter can be reached from the click's part of the network (Dijkstra finds no target).

A refused click draws only the clicked point (red) and opens a popup titled "Outside the walking
network" ("This point is 553 m from the nearest mapped path (limit 100 m).") or "No path to a
shelter". The popup is a non-modal `role="alertdialog"`: focus moves to its "Close" button,
Escape closes it, and the next click on the map replaces it. (Until 2026-11-08 the title was
"Good luck, champ. You won't make it…" and the button "Try again".)
While the network is still loading, or if it failed, the straight-line fallback stays, because
the panel already says that routes are unavailable.

The 100 m limit is a design choice, not a standard: it is well above the usual connector in town
and well below the gaps over water. On the same 30 × 30 grid as above (points evenly spaced
from corner to corner of the shelters' bounding box, `public/data` as committed on 2026-11-05):

- 835 of 900 points got a route, 55 were refused as too far from the network and 10 as
  unreachable.
- For the 835 routed points the connector had a median of 17.0 m and a 90th percentile of 53.4 m.

Tests (`tests/network.test.js`): a click 5 m from the network returns the same walk as
`findNearestByWalking`; a click ≈ 199 m away returns `far` with the connector length; a click
on the isolated island path returns `unreachable`.

#### Building passages

OSM maps some footways _through_ buildings: building passages (`tunnel=building_passage`),
arcades, shopping centres and station halls. A route that uses one looks odd in 3D, because the
line drapes over the roof. The app therefore colours those buildings green in Cesium OSM
Buildings and lists them under "Through" in the panel.

1. **Overlay, once, in a script.** `scripts/fetch-passages.js` downloads the walkable ways (same
   filter as the network, with tags and geometry) and the building footprints (OSM ways and
   multipolygon relations, `out geom`) for the network's bounding box. `utils/passages.js` cuts
   every way segment where it crosses a footprint ring and tests the midpoint of each piece with
   an even–odd point-in-polygon test, so the length inside the building is exact for straight
   segments and courtyards (inner rings) count as outside. This runs in a local planar frame
   (equirectangular on a sphere around the segment), whose error over building-sized distances is
   far below the accuracy of OSM footprints.
2. **Thresholds and filters.** A building counts for a way only if at least 5 m of that way
   lies inside it, summed over the way's segments, so a footway that grazes a wall because of
   mapping noise is not a passage. `building=roof` (canopies) is skipped, and so are ways tagged
   `tunnel=yes|culvert|flooded` or `bridge=*`, which pass under or over a footprint.
3. **Lookup at click time.** The segments are mapped to node indices of the committed
   `walking-network.json` by exact micro-degree coordinates. The app indexes them by edge, and
   after Dijkstra it checks each edge of the route path (`buildingsOnPath`).
4. **Highlighting.** `layers/buildings.js` sets a
   [`Cesium3DTileStyle`](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileStyle.html) whose
   `color` conditions match `${elementType}` and `${elementId}`. Cesium OSM Buildings keeps these
   properties from the OSM way or relation each building was made from (checked in the InfoBox,
   for example `elementType way`, `elementId 127108892`). All other buildings keep the tileset's
   previous colour expression, and the old style is restored with the next click. This uses the
   [3D Tiles styling language](https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling),
   so no geometry has to be loaded or drawn by the app.

Results (2026-11-05):

- 254 buildings are passed through by the network, from 33 025 walkable ways and 57 945
  footprints. All 773 segments inside them were found in the 2026-10-27 network snapshot.
- By `building` tag: 76 apartments, 27 retail, 20 dormitory, 18 office, 14 parking, 13
  commercial and 9 civic buildings, and fewer of 25 other types (including 4 bunkers and 4
  train stations).
- On the 30 × 30 grid, 45 of the 835 routes (5.4 %) pass through at least one building. The
  most frequent were an unnamed school (21 routes), an unnamed apartment building (12) and
  Byhaven kjøpesenter (5).
- Browser check (dev server, 1600 × 900): a click on the Brattøra pier gave shelter no. 30667
  (Olav Tryggvasons gate 28), a 1.69 km walk, "Through: Byhaven kjøpesenter (retail)". The
  building turned green next to the shelter (screenshot inspected). From the Nidarosdomen view
  a route listed "a religious building" (OSM way 538616652, unnamed).

Tests (`tests/passages.test.js`, hand-made geometry): the length inside a square and a square
with a courtyard; a way through a building (found), the same way split into 3 m segments
(found, by summing), a way cutting a corner by 2.8 m (ignored), a path inside a courtyard
(ignored) and across the whole block (found); roofs, tunnels and bridges (ignored); joining a
relation's outer ring from two ways; edge lookup in both directions; and a passages file made
for another network snapshot (ignored with a warning).

**Is a building on the route a public place?** Often, but not always. The network already
leaves out `access=no|private` and `foot=no` ways, and the named results are mostly shopping
centres, stations, university buildings and the cathedral. But the largest group is apartment
buildings, which are mostly passages through a block, and opening hours are not considered: a
shopping centre at 03:00 is still on the route.

Limitations:

- The node indices are tied to one network snapshot. The file stores the network's OSM
  timestamp, and the app ignores the passages (with a console warning) if it does not match;
  after `npm run data:network`, run `npm run data:passages` too.
- The footprints are from 2026-11-05 but Cesium OSM Buildings is an older processed copy of OSM.
  A building that was redrawn since then has a new id and is named in the panel but not
  coloured.
- A straight connector (click → network, network → shelter) that crosses a building is not
  checked; only network edges are.
- Opening hours, doors and indoor levels are not modelled.

### Walking network

`public/data/walking-network.json` is committed. To regenerate it from the Overpass API:

```powershell
npm run data:network
```

The script requests all OSM ways with a walkable `highway` tag inside the shelters' bounding
box plus a margin of about 1 km. The tags are footway, path, pedestrian, steps, living_street,
residential, service, unclassified, road, track, cycleway, and tertiary, secondary and primary
roads with their links, plus trunk_link. Motorways and trunk roads are excluded, and so are ways
tagged `foot=no|private` or `access=no|private`.

The file stores node coordinates as integer micro-degrees (1e-6°, about 0.1 m) relative to a
south-west origin, and each way as a list of node indices (`utils/osmNetwork.js`). This halves
the size compared with decimal degrees. The 2026-10-27 extract has 164 294 nodes and 32 944
ways (OSM data timestamp 2026-10-27T10:35:02Z). The script refuses to overwrite the file if
Overpass returns no ways.

### Building passages (data)

`public/data/building-passages.json` (43 kB) is committed. To recompute it:

```powershell
npm run data:passages
```

It needs the committed `walking-network.json`, because it stores node indices of that file (see
[Building passages](#building-passages)). The walkable-way filter is shared with the network
script (`walkableWaysQuery` in `utils/osmNetwork.js`). Overpass answered HTTP 502 twice before
the first successful run, so the script retries 429/502/503/504 answers up to three times with
30 s in between. The 2026-11-05 run (OSM data 2026-11-05T19:44:49Z) took 97 s to download and
4.3 s for the overlay. The script refuses to write the file if Overpass returns no ways or no
buildings. The file is kept out of Prettier, so a re-run does not break `format:check`.

### Shelters

`public/data/shelters.geojson` is committed. To regenerate it from DSB's WFS service:

```powershell
npm run data:shelters
```

The script requests `layer_340` (Tilfluktsrom – Offentlige) within a bounding box around
Trondheim in EPSG:25832, converts the points to WGS84 GeoJSON and keeps the shelter number,
capacity and address. It refuses to overwrite the file if the service returns no valid features.

**Provenance.** The script records where and when the data came from in a `metadata` member of
the GeoJSON file. GeoJSON allows extra top-level members like this
([RFC 7946 §6.1, foreign members](https://datatracker.ietf.org/doc/html/rfc7946#section-6.1)),
and readers such as Cesium's
[`GeoJsonDataSource`](https://cesium.com/learn/cesiumjs/ref-doc/GeoJsonDataSource.html#.load)
ignore them. The shelter layer fetches the file itself, reads `metadata.fetched` and shows
"Tilfluktsrom: © DSB, NLOD · data fetched <date>" in Cesium's credit list (behind "Data
attribution"). The current file:

| Field          | Value                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| Fetched        | 2026-10-28 (UTC date)                                                                  |
| WFS URL        | `https://ogc.dsb.no/wfs.ashx` (WFS 2.0.0, `GetFeature`)                                |
| Layer          | `layer_340` (Tilfluktsrom – Offentlige)                                                |
| Request CRS    | EPSG:25832, bbox E 560 000–580 000 m, N 7 020 000–7 040 000 m                          |
| Features       | 12 (5 268 places in total)                                                             |
| CRS conversion | EPSG:25832 → WGS84 lon/lat with proj4, EUREF89 treated as WGS84, rounded to 7 decimals |

The 2026-10-28 re-fetch returned the same 12 shelters as the file committed on 2026-10-27, with
identical coordinates and attributes. Only the `metadata` member was added.

**Validation.** `utils/shelters.js` leaves out any WFS member without a valid point (two or
three finite numbers; a height is dropped), a whole-number shelter number or a whole-number
capacity, because the analysis and the totals depend on them. A missing address becomes an
empty string. The script prints each member it leaves out and why. If any member is left out,
it keeps the old file, because a partly invalid response may mean the service changed its
format; `npm run data:shelters -- --allow-skipped` writes the valid ones after a manual check.
The 2026-10-28 fetch left out none. The script formats its output with
Prettier, so `npm run format:check` passes after a re-fetch.

## Coverage and capacity

The nearest-shelter search answers one click. This analysis asks the same question for
everyone who lives in the study area: **how far is the walk from home to the nearest public
shelter, and how many residents are there per shelter place?** DSB's public shelters are for
the whole population, so residents ÷ places is a direct capacity measure.

**Data.** Statistics Norway's population grid, _Befolkning på rutenett 250 m_, 2026 edition:
registered residents counted in 250 m × 250 m squares
([Geonorge](https://kartkatalog.geonorge.no/metadata/uuid/0c0ad0ce-55e8-4d73-9c12-0eb0e2454acb),
NLOD). `npm run analysis:coverage` (`scripts/analyse-coverage.js`) fetches the cells that
intersect the walking network's bounding box from SSB's
[OGC API Features](https://kart.ssb.no/api/ogc/v1/befolkning_paa_rutenett_ogc_api) service
(collection `befolkning_250m_2026`, 1 000 features per page, following the `next` links). Only
cells with residents are in the dataset.

**CRS.** The service returns the cells in its storage CRS, labelled EPSG:32633 (WGS 84 / UTM
33N), even though GeoJSON
([RFC 7946 §4](https://datatracker.ietf.org/doc/html/rfc7946#section-4)) expects lon/lat. The
script checks that label and converts corners and centres with proj4 as EUREF89 / UTM 33N
(`utm33ToWgs84` in `utils/crs.js`; the two frames differ by under a metre). Trondheim lies in
zone 32, so zone-33 grid north is rotated by the meridian convergence, about −4.1° here
(unit-tested): on the map the cells are slightly tilted, not lon/lat rectangles.

**Method.**

1. **Service areas from one search** (`multiSourceDijkstra`, `utils/network.js`): Dijkstra starts
   from all twelve shelter nodes at distance 0. Every network node is settled first from its
   nearest shelter, which gives its walking distance and its shelter label in one pass: a
   network Voronoi diagram
   ([Erwig 2000](<https://doi.org/10.1002/1097-0037(200010)36:3%3C156::AID-NET2%3E3.0.CO;2-L>)).
   Because edges are undirected, distance from a shelter equals distance to it.
2. **Cell walks:** each cell centre gets the same walk a click there would get: the straight
   connector to its nearest network node, the network distance, and the shelter's own
   connector. Every 20th cell (53 cells) was checked against the app's single-point search
   (`findNearestByWalking`): same shelter and walk within 1 µm. The script stops if any differ.
3. **Study area:** cells whose centre lies inside the network's bounding box (1 045 cells). 40
   cells (4 191 residents) with their centre outside it are left out, because the network does
   not reach them.
4. **Summary** (`summarizeCoverage`, `utils/coverage.js`, unit-tested).

**Results** (2026-11-08):

| Walk from home to the nearest shelter | Residents | Share  |
| ------------------------------------- | --------- | ------ |
| ≤ 500 m                               | 12 598    | 6.9 %  |
| 500 m – 1 km                          | 35 460    | 19.4 % |
| 1–2 km                                | 76 930    | 42.1 % |
| 2–4 km                                | 53 174    | 29.1 % |
| > 4 km                                | 4 290     | 2.3 %  |
| No route (isolated paths)             | 109       | 0.06 % |
| **All, in 1 045 cells**               | 182 561   | 100 %  |

So 26.3 % of the residents live within 1 km on foot and 68.5 % within 2 km. The twelve shelters
have 5 268 places: **34.7 residents per place**. By catchment (the residents whose nearest
shelter on foot it is, `results/coverage-catchments.csv`):

| Shelter | Address                                 | Places | Residents | Per place |
| ------- | --------------------------------------- | ------ | --------- | --------- |
| 12330   | Øvre Flatåsveg 16                       | 45     | 8 051     | 178.9     |
| 12325   | Øvre Flatåsveg 2 A                      | 200    | 25 618    | 128.1     |
| 12333   | Gamle Jonsvannsveien 12                 | 280    | 26 848    | 95.9      |
| 11848   | Siriusveien 10                          | 200    | 17 959    | 89.8      |
| 48494   | Mellomveien 5                           | 450    | 26 519    | 58.9      |
| 30673   | Olav Kyrres gate 6 (St. Olavs hospital) | 500    | 24 575    | 49.2      |
| 30667   | Olav Tryggvasons gate 28                | 220    | 9 459     | 43.0      |
| 30677   | Østre Rosten 39 (Rostenhallen)          | 780    | 20 882    | 26.8      |
| 30678   | Hasselbakken 5A og 5 C                  | 513    | 10 766    | 21.0      |
| 30671   | Nedre Bakklandet 11–41                  | 800    | 7 768     | 9.7       |
| 20798   | Kjøpmannsgata 34                        | 650    | 2 373     | 3.7       |
| 6870    | Westermannsveita 4                      | 630    | 1 634     | 2.6       |

The pattern: the centre (Midtbyen, Bakklandet) has many places and few residents, the outer
residential areas few places and many residents. The three Midtbyen shelters together have
1 500 places for 13 466 residents in their catchments. This is "nearest on foot", not an
allocation: nobody is sent to a second shelter when the first is full.

**In the app.** A third layer switch, "Walking distance" (off by default), shows the cells
coloured by walk class with 55 % opacity: a 5-class blue–purple sequential scheme (ColorBrewer
BuPu), readable with colour-vision deficiencies, and grey for no route. While it is on, the map
key lists the classes. A click on a cell opens its InfoBox (residents, walk, shelter) _and_ runs
the nearest-shelter search from that point (`isCoverageCell` lets cell clicks through in
`onGroundClick`). A "Coverage" section in the panel shows the residents, residents per place and
the shares within 500 m, 1 km and 2 km, computed in the browser from the same file with the same
`summarizeCoverage`. A fourth view, "Whole study area" (centre of the network's box, 58.1 m
NN2000 from DTM 1, heading 0°, pitch −65°, range 20 km), shows the whole layer. The SSB credit is
in Cesium's credit list ("Data attribution"). The file is 111 kB and kept out of Prettier.

**Limitations.**

- **Night-time population:** the grid counts where people are registered as living, not where
  they are during the day (work, school, the city centre).
- **One walk per cell:** everyone in a 250 m cell gets the walk from its centre. Different cell
  sizes or positions would give different numbers (the modifiable areal unit problem). 15 cells
  (235 residents) have a centre more than 100 m from the network, where the walk starts with a
  long straight line.
- **Study area:** only the network's bounding box (shelters' box plus about 1 km), not the whole
  municipality.
- **No capacity allocation:** residents per place counts each resident at their nearest shelter
  on foot only; a location-allocation model with capacities would be the next step.

## Walking time on slopes

Trondheim is hilly. A walk up to Singsaker or Byåsen takes longer than the same distance on the
flat, and a shelter that is a little further away but downhill can be quicker to reach. Since
2026-11-08 the app measures walks in **minutes** as well as metres.

**Heights for the network** (`npm run data:heights`, `scripts/fetch-heights.js`):

1. Kartverket's national terrain model (_Nasjonal høydemodell_, DTM) from its WCS in EUREF89 /
   UTM 32N ([Geonorge](https://kartkatalog.geonorge.no/metadata/uuid/05821c51-2f5b-411f-9098-924d13dbea9a),
   CC BY 4.0), coverage `nhm_dtm_topo_25832`, as WCS 1.0.0 `GetCoverage` GeoTIFF tiles over the
   network's box plus 50 m: 9 tiles of up to 1 000 × 1 000 pixels, resampled by the server
   (bilinear) to 5 m. Read with `geotiff`. Not Cesium World Terrain, which the
   [terrain check](#terrain-check) showed to be 8 m RMSE off.
2. Every network node is converted to UTM 32 (`wgs84ToUtm32`, `utils/crs.js`) and sampled
   bilinearly between the four surrounding pixel centres (`sampleBilinear`, `utils/raster.js`,
   unit-tested, with no-data handling). 1 110 of 164 294 nodes fell on no-data pixels (the model
   has no values over water, e.g. at the ends of piers); they get the mean of their network
   neighbours.
3. **Bridges and tunnels:** the terrain model is the ground under a bridge (often the river) and
   the hillside above a tunnel. Walkable ways tagged `bridge=*` or `tunnel=*` (not
   `tunnel=building_passage`, which is at ground level) are fetched from Overpass and matched to
   network nodes by their micro-degree coordinates. 554 of 555 ways matched; the heights of
   their 222 inner nodes are interpolated linearly, by distance, between the two end nodes.
4. Written to `public/data/node-heights.json` (integer decimetres, 744 kB, Prettier-ignored),
   with the network's OSM timestamp. The app ignores the file, with a console warning, if the
   timestamp or the node count does not match (`withHeights`, `utils/network.js`).

**Check:** at the 59 network nodes of the terrain check, the 5 m resampled heights differ from
Kartverket's DTM 1 point heights (height API) by +0.10 m on average and at most 0.85 m.

**Walking time** (`utils/walkingTime.js`): Tobler's hiking function
([Tobler 1993](https://escholarship.org/uc/item/05r820mz)),

    v = 6 · exp(−3.5 · |s + 0.05|) km/h,  s = Δh / Δx,

gives 6 km/h on a 5 % downhill, 5.04 km/h on the flat and 3.55 km/h at 10 % uphill (unit-tested
values). Each edge takes `length / v` with the slope from its two node heights. The cost now
depends on the direction, so the graph is directed for time. Dijkstra takes an edge-cost
function (`byDistance` or `byTime`, `utils/network.js`). In the multi-source search the walk
runs towards the shelters, the opposite way from the search, so the cost is reversed there.
The straight connectors (click → network, network → shelter) have no heights and are walked at
the flat speed. Tests (`tests/network.test.js`): on a hand-made hill the shortest walk goes to
the hill-top shelter (300 m, 15 % up) and the fastest to the valley shelter (400 m, flat); uphill
and downhill times differ; the reversed multi-source search agrees; without heights the search
falls back to distance.

**In the app.** With heights loaded, "nearest" means **fastest on foot**. The panel shows, for
example, "Walk 266 m · 3 min (fastest, slopes included)" at Torvet. If the shortest walk leads
to another shelter, a "Shortest" row gives it ("No. … · … m · … min, shorter, but slower on the
slopes"). The coverage cells' InfoBox adds the fastest time, and the "Coverage" section adds the
shares of residents within 10 and 20 minutes. Without the heights file the app works as before,
by distance ("Slope data unavailable…", sixth case in `check-failed-layers.js`).

**Results** (2026-11-08):

- **Grid** (`npm run analysis:grid`, the 835 routed points of the 30 × 30 grid): slopes make the
  shortest walk a median 5.2 % slower than on the flat (90th percentile 14.3 %). At 23 points
  (2.8 %) the fastest shelter is another one than the nearest. Example: from 63.36772 N,
  10.47314 E the nearest shelter on foot is no. 12333 (6 248 m, 82.8 min), but no. 11848 is
  faster (6 424 m, 80.6 min). The fastest walk takes a median 25.4 min (p90 51.8 min).
- **Coverage** (`npm run analysis:coverage`, a second multi-source search by time): 17.7 % of
  the 182 561 residents live within 10 minutes of a shelter on foot, 52.6 % within 20 and 79.8 %
  within 30. For 8 047 residents (39 cells) the fastest shelter differs from the nearest. Both
  results were checked against the single-point search for every 20th cell (53 cells).

**Limitations.** Tobler's function describes an average hiker on a trail, fitted to Imhof's
data. It does not model stairs (they get the terrain slope), crowds, traffic lights, age,
fitness or carrying things. A 5 m terrain model smooths short ramps and kerbs. Heights inside
building passages are the terrain model's interpolation under the building.

## Route check against an independent router

Are the app's walks right? `node scripts/validate-routes.js` compares them with
[OSRM](https://project-osrm.org/) and its foot profile on FOSSGIS's public server
([routing.openstreetmap.de](https://routing.openstreetmap.de/about.html)). OSRM is an
independent router with its own OSM extract (updated about every two days) and its own rules
for which ways a pedestrian may use.

**Method.**

- **Points:** every 4th of the 835 routed points of the 30 × 30 grid (209 points).
- **Comparison:** for each point the app's shortest walk (by distance) and OSRM's route from the
  same point to the shelter the app chose. OSRM's distance is counted end to end like the
  app's: route plus the straight snapping distances at both ends. OSRM snaps to the nearest
  street, the app to the nearest node.
- **Usage policy:** at most one request per second, no heavy use, a valid User-Agent. The script
  waits 1.1 s between requests (209 requests, 4 min 12 s) and sends the project's User-Agent.
  OSRM is only used for this check. Nothing from it is in the app.
- **Output:** every point is in `results/route-validation.csv`; the summary is in
  `analysis-summary.json` (`routeValidation`), which "How it works" shows.

**Results** (2026-11-08, 209 points; difference = OSRM − app, in % of the app's walk):

| Measure                    | Value   |
| -------------------------- | ------- |
| Median difference (signed) | +1.28 % |
| Median absolute difference | 1.59 %  |
| 90th percentile, absolute  | 6.14 %  |
| Within 5 %                 | 84.7 %  |
| Within 10 %                | 95.2 %  |

For most points the two routers agree within a few per cent; OSRM's walks are slightly longer
on median (not investigated further). The largest differences:

| Start (WGS84)         | Shelter | App     | OSRM    | Difference |
| --------------------- | ------- | ------- | ------- | ---------- |
| 63.37580 N 10.43397 E | 11848   | 2 812 m | 3 999 m | +42.2 %    |
| 63.41888 N 10.35561 E | 30673   | 2 899 m | 3 530 m | +21.8 %    |
| 63.43503 N 10.38919 E | 30667   | 1 269 m | 1 029 m | −19.0 %    |

Two of them were looked into by comparing OSRM's route geometry (`overview=full`) with the
app's network nodes:

- **−19.0 %** (Brattøra, OSRM shorter): eight of OSRM's 74 route vertices lie more than 3 m from
  any node of the app's network, up to 37 m, around 63.4347 N, 10.3925 E. OSRM uses a
  connection there (its off-network vertices span 54 m) that is not in the app's 2026-10-27
  snapshot. Not determined: whether
  that way is new in OSM since the snapshot or left out by the app's way filter.
- **+42.2 %** (the app shorter): only OSRM's first and last vertices are more than 3 m from the
  app's network, so OSRM follows the same network but takes a longer way round. Not determined:
  which way of the app's path OSRM's foot profile avoids (for example because of an access tag
  or a barrier node; the app ignores barriers).

The check does not say which router is right. For most points an independent router finds a
walk of about the same length, and the two outliers that were inspected point to differences
in the data and the rules (snapshot age, way filter, barriers), not in the shortest-path search
itself.

## Heights and the geoid

Cesium positions everything with **ellipsoidal heights** h, above the WGS84 ellipsoid.
Norwegian maps and Kartverket's terrain models use **NN2000 heights** H, above a reference
surface close to mean sea level. The two differ by the **geoid height** N: h = H + N. In
Trondheim N is about 39.4 m, so mixing the two puts things 39 m too high or too low.

**The model.** `npm run data:geoid` (`scripts/fetch-geoid.js`) downloads Kartverket's height
reference model **HREF2025A_NN2000_EUREF89** from Geonorge. This is the official model for
NN2000:2025 from 2026-10-14 ([Kartverket](https://www.kartverket.no/til-lands/posisjon/href-hoydereferansemodell),
[Geonorge metadata](https://kartkatalog.geonorge.no/metadata/uuid/384ce432-8da7-4cfa-9afa-140d2b6c29d3),
CC BY 4.0). The zip holds a GeoTIFF lattice of N values, 0.02° × 0.04° apart, as "pixel is
point". The script reads it with [`geotiff`](https://geotiffjs.github.io/geotiff.js/) (new dev
dependency 3.0.5, used only by scripts) and keeps the 7 × 7 nodes around the walking network,
written to `src/utils/geoidGrid.js` (N 39.04–39.89 m). The zip is unpacked with Node's `zlib`, so
no unzip tool is needed. `utils/geoid.js` interpolates N bilinearly between the four nearest
nodes, as PROJ does for vertical grids.

**Checks.**

- `tests/geoid.test.js`: node values, a cell centre and a quarter point on a hand-made lattice,
  points just outside, and the floating-point edge case ((63.5 − 63.48) / 0.02 is slightly more
  than 1, which first returned `undefined` on the last row), plus Torvet against the API.
- Against Kartverket's [transformation API](https://ws.geonorge.no/transformering/v1/)
  (EPSG:4937 → EPSG:5942, so h = 0 gives H = −N): at 16 points over the area the largest
  difference was 0.80 mm (recorded in `geoidGrid.js`). During development the same
  interpolation of the previous model, HREF2018B, matched the API to 0.00 mm at 5 points, so
  the API still uses HREF2018B, and the 0.8 mm is the 2018 → 2025 model update in Trondheim.

**Where it is used.**

- The camera presets store NN2000 target heights (ground from DTM 1 plus an aim height), and
  `toCameraOptions` converts them (see [Camera views](#camera-views)).
- A click on the ground shows "Ground: 0.9 m NN2000 (ellipsoidal 40.3 m − geoid 39.4 m)" in the
  panel (Torvet, 1600 × 900 and 390 × 844). `onGroundClick` now also returns the ellipsoidal
  height that `Globe.pick` found on Cesium World Terrain.

### Terrain check

That 0.9 m at Torvet is wrong: Kartverket's DTM 1 gives 9.59 m there. The geoid conversion is
not the cause, because it is checked to a millimetre. Cesium World Terrain itself is too low. To
measure this, `node scripts/check-terrain.js`:

1. picks points on the walking network: an 8 × 8 grid over the shelters' bounding box, each
   moved to its nearest network node, dropping grid points more than 100 m from the network
   (fjord, river);
2. gets DTM 1 heights (NN2000) from Kartverket's
   [height API](https://ws.geonorge.no/hoydedata/v1/) (`dtm1` source, 50 points per request);
3. builds the app with `VITE_BENCHMARK=true`, opens it in Playwright, and samples Cesium World
   Terrain at the same points with
   [`sampleTerrainMostDetailed`](https://cesium.com/learn/cesiumjs/ref-doc/global.html#sampleTerrainMostDetailed)
   (new `sampleTerrain` hook in `src/benchmark.js`), so the result does not depend on what the
   view has loaded;
4. compares Cesium h − N with DTM 1 and writes every point to `results/terrain-vs-dtm1.csv` and
   the summary to `public/data/analysis-summary.json`, which "How it works" shows.

The build and preview helpers moved from `benchmark-buildings.js` to `scripts/browser.js`, so
both scripts share them.

Run on 2026-11-08 (59 points):

| Cesium World Terrain − DTM 1 | Value   |
| ---------------------------- | ------- |
| Mean (bias)                  | +1.67 m |
| RMSE                         | 8.03 m  |
| Median absolute difference   | 4.98 m  |
| 90th percentile, absolute    | 12.67 m |
| Largest absolute difference  | 21.52 m |

The mean is close to zero, so there is no systematic height-system error: without the geoid
correction it would be about +39 m. The points range from 3.3 to 385.3 m NN2000. The six
largest differences (13.4–21.5 m) are all at points 66–347 m up, in the hills. Of the six points
below 30 m, four agree within 2.3 m; the other two differ by 4.2 m and 12.1 m. The camera
targets were sampled the same way (most detailed level, same build): Cesium World Terrain gives
H = 0.90 m at Torvet (DTM 1: 9.59 m) and 1.65 m at Nidarosdomen (13.77 m), so the rendered ground
there is 9–12 m too low and the OSM buildings stand on it; at Nedre Bakklandet it gives 1.79 m
(2.7 m). Not verified: what source and resolution Cesium World Terrain uses in Norway.

For this project it means: Cesium World Terrain is fine as a backdrop but not as data. The
terrain-aware walking time (next step) should use Kartverket's DTM, not Cesium's terrain.

## How it works

The "How it works" button opens a side sheet (full screen on mobile). It is a native
[`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) opened with
[`showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal),
so the browser keeps focus inside it and closes it on Escape; focus then returns to the button. A
click on the backdrop also closes it. It has five parts:

1. **The question** the app answers.
2. **Data:** one card per dataset with provider, format, CRS, date, use and licence. The dates
   are read at run time, not typed into the text: the shelter fetch date from the `metadata`
   member of `shelters.geojson`, and the OSM dates of the walking network and the building
   footprints from their files (`useWalkingNetwork`). Streamed Cesium ion data is marked
   "streamed".
3. **GIS concepts**, in the order a click uses them: CRS conversion, ellipsoidal vs NN2000
   heights, ECEF and ENU frames, picking the ground, geodesic distance, the network graph and
   Dijkstra, walking time on slopes, snapping and the 100 m rule, service areas from one search, population on a grid
   (MAUP), the building-passage overlay, and 3D Tiles level of detail (12 since 2026-11-08). Each has a 2–3 sentence explanation and a link to the API docs, the EPSG entry or the
   original paper.
4. **Key results** from `public/data/analysis-summary.json` (see [Grid analysis](#grid-analysis)),
   plus the live shelter count and capacity.
5. **Limitations**, a short version of [Limitations](#limitations).

The text lives in `src/content/about.js`, as data. `tests/about.test.js` checks that every
dataset has a licence, a CRS and HTTPS links, that every concept has a reference, and that the
committed summary file turns into result rows without `undefined`. The shelter file and the
summary are fetched the first time the sheet opens (`hooks/useAboutFacts.js`). If the summary
fails, the sheet says "The analysis results could not be loaded." and the rest still works:
checked with Playwright by aborting the request for `analysis-summary.json` (note shown, shelter
date still shown, no page errors).

### Grid analysis

`npm run analysis:grid` (`scripts/analyse-grid.js`) runs the same search as a click,
`findWalkInRange` with the 100 m rule, from a 30 × 30 grid of points spaced evenly (in degrees)
from corner to corner of the shelters' bounding box (`utils/grid.js`, unit-tested). It writes
`public/data/analysis-summary.json`, which the "How it works" sheet reads, so the numbers in the
app come from this script. To run in plain Node the script imports `config.js`, so `config.js`
no longer uses `import.meta.env`: the `.env` values moved to `src/env.js` (see
[Cesium ion Token and Security](#cesium-ion-token-and-security)).

Run on 2026-11-08 with the committed data (shelters fetched 2026-10-28, network 2026-10-27,
footprints 2026-11-05):

| Result                                                | Value                       |
| ----------------------------------------------------- | --------------------------- |
| Routed / refused as too far / refused as unreachable  | 835 / 55 / 10 of 900        |
| Nearest on foot ≠ nearest in a straight line          | 137 of 835 (16.4 %)         |
| Walk ÷ geodesic distance to the same shelter (detour) | median 1.33, p90 1.70       |
| Walking distance                                      | median 2 024 m, p90 4 118 m |
| Connector, click → network                            | median 17.0 m, p90 53.4 m   |
| Routes through at least one building                  | 45 of 835 (5.4 %)           |

The routed, refused, connector and building counts match [Out of range](#out-of-range) and
[Building passages](#building-passages). The 19 % and the 1.34 / 1.68 in
[Nearest shelter](#nearest-shelter) come from the earlier 2026-10-27 run, which had no 100 m rule
and so also routed points far from the network (884 reachable points). Quantiles here use linear
interpolation between ranks (type 7, as NumPy's default).

## Quality checks

Hardening pass on 2026-10-28. Screenshots from the check scripts go to the OS temp folder unless a folder is given. The browser checks ran against the production build
(`npm run build`, then `npx vite preview --port 4174`) with a personal Cesium ion token, in
Playwright's Chromium 156 with GPU flags (`--use-angle=d3d11`), headless, on Windows 11 with an
AMD Radeon 780M.

### Robustness

Unit tests cover the failure cases that matter for the data:

- `tests/shelters.test.js` with `tests/fixtures/shelters-invalid.gml`: WFS members with no
  geometry, a position with only one number, an empty or non-numeric capacity ("ca. 200"), no
  shelter number, a missing address, and a feature from another layer. A response that is not a
  FeatureCollection (for example a WFS `ExceptionReport`) gives an empty collection, which the
  script refuses to write.
- `tests/nearest.test.js` and `tests/network.test.js` already covered the nearest-shelter edge
  cases: an empty shelter list, a click on a shelter (distance 0), identical points and
  unreachable shelters.
- `tests/credit.test.js`: a missing or malformed fetch date leaves the credit unchanged.
- `tests/passages.test.js`: a passages file made for another network snapshot is ignored.

`scripts/check-failed-layers.js` blocks one request with Playwright's
[`page.route`](https://playwright.dev/docs/api/class-page#page-route), then flies to Nidarosdomen
and clicks the ground. It asserts the expected switch states, messages and result, and that
there are no page errors, and exits with code 1 if any check fails (it exited 0). Result at
1600 × 900:

| Case                                          | Messages and panel                                                                           | After a ground click                                     | Page errors |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------- |
| Nothing blocked                               | Both layers ready, "12 public shelters · 5,268 places in total"                              | Shelter no. 30671: 489 m walk, 335 m straight            | none        |
| `shelters.geojson` blocked                    | "Shelter data could not be loaded." Shelter switch disabled ("Unavailable"), buildings ready | No search (no shelters); view buttons and map still work | none        |
| `walking-network.json` blocked                | "Walking network unavailable: showing straight-line distances." Both layers ready            | Shelter no. 30671: 335 m straight, no walking distance   | none        |
| `building-passages.json` blocked (2026-11-05) | "Building passages unavailable: routes are shown without them." Both layers ready            | Shelter no. 30671: 489 m walk, 335 m straight            | none        |

Re-run on 2026-11-08 with six cases (the same click, now with walking times). It exited 0 with
no `FAIL`; every case asserts the switch states, the toast, whether a walk and a time are shown,
and no page errors:

| Case (2026-11-08)                | Toast                                                                    | After the click                                                     |
| -------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Nothing blocked                  | none                                                                     | No. 30671: 491 m · 6 min (fastest, slopes included), 337 m straight |
| `shelters.geojson` blocked       | "Shelter data could not be loaded."                                      | "Shelter data is unavailable."                                      |
| `walking-network.json` blocked   | "Walking network unavailable: showing straight-line distances."          | No. 30671: 337 m straight, no walk                                  |
| `building-passages.json` blocked | "Building passages unavailable: routes are shown without them."          | No. 30671: 491 m · 6 min                                            |
| `coverage.json` blocked          | "Walking-distance layer could not be loaded." Switch "Unavailable"       | No. 30671: 491 m · 6 min                                            |
| `node-heights.json` blocked      | "Slope data unavailable: routes are by distance, without walking times." | No. 30671: 491 m along streets and paths, no minutes                |

### Performance

`scripts/benchmark-buildings.js` builds the app twice, each time with a different
`maximumScreenSpaceError` for Cesium OSM Buildings
([`Cesium3DTileset.maximumScreenSpaceError`](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html#maximumScreenSpaceError)).
SSE is the error, in pixels, that Cesium accepts before it loads a more detailed tile, so a
higher value loads fewer and coarser tiles. The value is set at build time through
`VITE_BUILDINGS_SSE` (default 16). `VITE_BENCHMARK=true` adds `src/benchmark.js`, which exposes
`window.__benchmark`. A normal build contains no benchmark code (checked: no `__benchmark` in
`dist/assets`).

Each value gets 3 runs, each in a fresh browser context (empty cache), at the Midtbyen start view
at 1600 × 900:

- **First load:** time from navigation until terrain (`globe.tilesLoaded`) and the buildings
  ([`tileset.tilesLoaded`](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html#tilesLoaded))
  have loaded every tile the view needs, and World Terrain has replaced the smooth ellipsoid the
  Viewer starts with. The state is polled every 50 ms and must hold for 4 polls in a row,
  because `tilesLoaded` can be true for a moment before any tile is queued. The time recorded is
  the first poll of that streak.
- **Frame rate:** a scripted 10 s, 360° orbit around Torvet at the preset pitch and range.
  Render-on-demand is switched off during the orbit. The camera moves in
  [`scene.preRender`](https://cesium.com/learn/cesiumjs/ref-doc/Scene.html#preRender), and each
  frame is timed in `scene.postRender`. 5th-percentile fps = 1000 / 95th-percentile frame time
  (`utils/frameStats.js`, unit-tested).
- **Memory:** building tiles
  ([`totalMemoryUsageInBytes`](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html#totalMemoryUsageInBytes))
  and JS heap, after the orbit.

Medians of 3 runs (every run is in `results/buildings-benchmark.csv`):

| SSE         | First load | Mean fps | 5th-pct fps | Worst frame | Building tiles | JS heap |
| ----------- | ---------- | -------- | ----------- | ----------- | -------------- | ------- |
| 16 (chosen) | 3.05 s     | 58.7     | 51.0        | 101.3 ms    | 26.8 MiB       | 190 MiB |
| 32          | 3.19 s     | 58.7     | 48.5        | 103.7 ms    | 17.9 MiB       | 141 MiB |

The frame rate is the same for both values. It sits just under the 60 Hz display refresh, so on
this GPU rendering is not the bottleneck. First-load time is also the same within run-to-run
variation (SSE 16 ranged from 3.04 to 4.78 s), so network speed dominates it. The one clear
gain at SSE 32 is a third less tile memory. But the screenshots (`results/buildings-sse-16.png`
and `results/buildings-sse-32.png`) show that at SSE 32 many smaller buildings in Midtbyen and
east of the river are not drawn at all; only their roofs in the imagery are visible. **SSE 16
(Cesium's default) stays**, because the buildings are what the user came to see.

An earlier run on the same day used a looser load condition (no terrain check, no stable
streak) and gave 5.27 s against 3.28 s. The code review flagged that this condition could fire
too early or late, so it was tightened and the benchmark re-run; the table above is from the
re-run only.

### Accessibility

- All panel controls are real `<button>` elements, or checkboxes with the `switch` role inside a
  `<label>`. `scripts/check-accessibility.js` tabs through the page at 1600 × 900 and 390 × 844.
  The tab order is Cesium's credit links, then "← My GIS module", "How it works", the panel
  toggle, the three view buttons and the two layer switches. Every stop has a visible focus
  outline. Space toggles a switch (checked before and after) and Enter presses a button. On
  mobile, the first stops in the collapsed panel are "← My GIS module", "How it works" and then
  "Show controls", and Enter opens it. Since 2026-11-08 the script also opens "How it works"
  with Enter and asserts that focus moves into the dialog, that 8 Tabs keep it there, that the
  key results are shown, and that Escape closes it and returns focus to the button. The script
  asserts these points and exited 0.
- Contrast: since 2026-11-08 the panel, popup and toasts are neutral dark grey (rgb(28 30 34),
  92 % opaque). The worst case is white imagery behind it, where the panel mixes to
  rgb(46 48 52). There, text (#e6e8eb) has 10.8:1, muted text (#a7adb5) 5.9:1, the blue accent
  (#6cb4ff, links and focus outlines) 6.1:1, the red "No route" label (#ff6b61) 4.7:1 and the
  green "highlighted on the map" note (#3ddc84) 7.4:1
  ([WCAG 2.2 contrast minimum, 4.5:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).
  The switch's off track (#8b9097) has 4.1:1
  ([non-text contrast, 3:1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)),
  and the dark button text on the accent 8.7:1. These ratios are computed from the colours with
  the WCAG formula, not measured on screen. (Before: the 2026-11-05 near-black design gave 12.5:1
  for text and 6.1:1 for muted text.)
- Reduced motion: with `prefers-reduced-motion: reduce` (Playwright's
  [`reducedMotion`](https://playwright.dev/docs/api/class-browser#browser-new-context-option-reduced-motion)),
  pressing Nidarosdomen jumped straight to the view, and `tests/motion.test.js` checks that the
  flight duration is 0. CSS transitions are still turned off.

## Limitations

- **Cesium World Terrain is coarse in Trondheim.** At points on the walking network it differs
  from Kartverket's DTM 1 by an RMSE of 8.0 m, and up to 21.5 m (see
  [Terrain check](#terrain-check)); at Torvet it is 8.7 m too low. The "Ground" height shown for
  a click is therefore not a survey-grade NN2000 height, even though the geoid conversion
  itself is accurate to about a millimetre. It also depends on the terrain detail loaded at the
  time of the click.
- **Walking times are for an average walker.** Tobler's function on a 5 m terrain model; stairs,
  crowds, age and fitness are not modelled (see [Walking time on slopes](#walking-time-on-slopes)).
- **Coverage is about where people live.** The SSB grid counts registered residents in 250 m
  cells, gives everyone in a cell the walk from its centre, and only covers the network's
  bounding box; see [Coverage and capacity](#coverage-and-capacity).
- **NN2000:2025 vs NN2000:2018.** The geoid model is HREF2025A (official from 2026-10-14). DTM 1
  heights from the height API and Kartverket's transformation API still use NN2000:2018
  (HREF2018B). In Trøndelag the two differ by less than 1 mm (measured below), far below the
  other errors.
- **EUREF89 is treated as WGS84.** The shelters are converted from EUREF89 / UTM 32N with proj4,
  without a datum shift. The difference between the two frames is under a metre, which is below
  the accuracy of a shelter point on a city map.
- **OSM building completeness.** Cesium OSM Buildings comes from OpenStreetMap, so which buildings
  exist, and how tall they are, depends on what mappers have entered. Roof shapes are generic.
  The buildings were not compared with Kartverket's FKB building data.
- **Keyboard users cannot run the nearest-shelter search**, because it needs a click on the map.
  The panel itself is fully keyboard-accessible.
- On mobile, the nearest-shelter result is only visible while the bottom sheet is open. The open
  sheet also covers Cesium's credit line; the collapsed sheet no longer does (fixed 2026-10-28,
  see [Status](#status)).
- The search also runs when the shelter layer is hidden.
- The benchmark covers one machine, one view and headless Chromium. The frame rate is capped by
  the 60 Hz display, so it cannot tell apart settings that both render faster than that.

## Cesium ion Token and Security

- The token is read from `.env` as `VITE_CESIUM_TOKEN`. `.env` is git-ignored, so do not commit
  it.
- Vite embeds `VITE_` variables in the client bundle, so **the token is public in a production
  build**. For deployment, use a separate token with minimal scopes that is restricted to the
  deployed URL in Cesium ion.
- **Only the token is in the bundle.** `src/env.js` is the only file that reads `.env`, one key
  at a time (`import.meta.env.VITE_CESIUM_TOKEN`). Vite replaces each such expression with its
  value. An expression that uses the whole `import.meta.env` object makes Vite paste the whole
  object, with every `VITE_` variable, into the bundle. That happened on 2026-11-08 in step 1
  (`import.meta.env ?? {}` in `config.js`, so Node scripts could import it) and was fixed
  before it was pushed. Checked after the fix, without printing any value: of the variables in
  `.env` (only `VITE_CESIUM_TOKEN`), the token's value occurs once in `dist/assets`, no
  `VITE_` name occurs, Vite's env object (`MODE`, `DEV`, …) is not inlined, and there is no
  `__benchmark`. A test build with `VITE_BUILDINGS_SSE=32` still compiled to
  `maximumScreenSpaceError: 32`.
- On GitHub Pages the token comes from the repository secret `CESIUM_ION_TOKEN`, which
  `.github/workflows/pages.yml` passes to the build as `VITE_CESIUM_TOKEN`. See the root
  [README](../README.md#deployment).

## Attribution and Licences

On-screen credits come from Cesium's credit display, the shelter layer's credit and the OSM
credit under the nearest-shelter result. The InfoBox
and credits are kept enabled on purpose.

| Data                                                 | Source                                                  | Licence / terms                                                           |
| ---------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Cesium World Terrain (ion 1), default imagery        | Cesium ion                                              | [Cesium ion Terms of Service](https://cesium.com/legal/terms-of-service/) |
| Cesium OSM Buildings (ion 96188)                     | © OpenStreetMap contributors                            | [ODbL](https://opendatacommons.org/licenses/odbl/)                        |
| Tilfluktsrom – Offentlige (public shelters)          | © DSB (Direktoratet for samfunnssikkerhet og beredskap) | [NLOD 2.0](https://data.norge.no/nlod/en/2.0)                             |
| Walking network (OSM ways via Overpass API)          | © OpenStreetMap contributors                            | [ODbL](https://opendatacommons.org/licenses/odbl/)                        |
| Building passages (OSM footprints via Overpass API)  | © OpenStreetMap contributors                            | [ODbL](https://opendatacommons.org/licenses/odbl/)                        |
| Befolkning på rutenett 250 m, 2026 (population grid) | © Statistisk sentralbyrå (SSB)                          | [NLOD](https://data.norge.no/nlod/no/1.0)                                 |
| Height reference model HREF2025A (geoid)             | © Kartverket                                            | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                 |
| DTM 1 point heights (height API)                     | © Kartverket                                            | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                 |
| Nasjonal høydemodell DTM (WCS, node heights)         | © Kartverket                                            | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                 |

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

Nearest shelter (2026-10-27): implemented and checked (see [Nearest shelter](#nearest-shelter)).
Lint, format check, tests (7 files, 31 tests) and build pass.

Walking routes (2026-10-27): the nearest shelter is now found by walking distance on the OSM
network, computed in the browser (see [Nearest shelter](#nearest-shelter)). Lint, format check,
tests (8 files, 42 tests) and build pass, and the route was checked in the browser at 1600 px
and 390 px. Open limitations: on mobile the result is only visible when the bottom sheet is
open, and the search also runs when the shelter layer is hidden.

Hardening (2026-10-28): the shelter data was re-fetched, with provenance in the file and the
fetch date in the credit. Invalid WFS attributes are now skipped and reported. Failed-layer,
keyboard and benchmark checks were added, panel contrast was raised, and the limitations are
collected in one place (see [Quality checks](#quality-checks) and [Limitations](#limitations)).
Lint, format check, tests (11 files, 54 tests) and build pass.

Not verified: screen-reader behaviour (no screen reader was used), Firefox and Safari, and
performance on a phone.

Website (2026-10-28, sprint session 9): the app is part of the "My GIS module" site at
`/trondheim-3d/`. The Vite `base` was already relative (`./`). Changes:

- A "← My GIS module" link in the panel, in the NTNU blue shared by all apps.
- A shared favicon.
- A fix for the mobile credits. Cesium's `Viewer.resize()` writes an inline `bottom` style on
  the credit container (`Viewer.js`, CesiumJS 1.146.0), so the old `bottom: 65px` rule never
  applied, and the collapsed sheet had always covered the Cesium ion credit line. The rule now
  uses `!important` and the collapsed sheet's measured height (103 px with the link). Playwright
  at 390 px: the credits end at y = 736, and the sheet starts at y = 741.

Lint, format check, tests (11 files, 54 tests) and build pass. The assembled site, served under
the repository prefix, passed a Playwright round trip (homepage → Trondheim 3D → "← My GIS
module" → homepage) at 1600 and 390 px with no console errors or failed requests, using the local
development token.

Live (2026-10-28): deployed at
<https://progrimm.github.io/TBA4565-Geomatics-Specialization-Course/trondheim-3d/> by the
[Pages workflow](https://github.com/progrimm/TBA4565-Geomatics-Specialization-Course/actions/runs/40763110583), with [Project 2 CI](https://github.com/progrimm/TBA4565-Geomatics-Specialization-Course/actions/runs/40763110659) passing on GitHub.
Terrain, imagery, buildings and shelters load with the production token, and the Playwright
round trip passed at 1600 and 390 px with no console errors or failed requests. The token's
Allowed URLs restriction works: `api.cesium.com` answers HTTP 200 for the Pages origin and
HTTP 403 for `https://example.com`.

NTNU design (2026-10-28): the UI now uses the homepage's palette, NTNU blue `#00509e` on white
with navy text `#0f2a47`, instead of dark glass with an orange accent. Only colours changed:
design tokens in `src/style.css`, sentence-case section headings, `color-scheme: light`. The map
symbology keeps its colours (orange shelters, cyan route), because they are chosen for contrast
on aerial imagery, where NTNU blue would disappear on dark water. Lint, format check, tests
(54) and build pass. `scripts/check-accessibility.js` passed against the built site after its
mobile tab-order expectation was updated for the home link. Screenshots at 1600 and 390 px
(panel, nearest-shelter result, InfoBox, a switched-off layer) were inspected.

Out of range, building passages and crisis design (2026-11-05), in five commits:

- **Out of range** (see [Out of range](#out-of-range)). Browser check on the dev server: at
  1600 × 900 a click on the railway yard by Trondheim S was refused at 101 m and a click in the
  fjord at 553 m; at 390 × 844 a fjord click at 654 m. The popup opened with focus on "Try
  again" and Escape closed it. A click in Midtbyen still gave a route. No console errors.
- **Building passages** (see [Building passages](#building-passages)): new script, data file and
  highlighting. `check-failed-layers.js` got a fourth case that blocks the passages file; all
  four cases passed (exit 0, no `FAIL`).
- **Design.** The NTNU light look was replaced by a dark crisis-tool look: near-black panel and
  popup, bone-white text, the shelter amber `#f5a623` as the only UI accent, uppercase monospace
  section labels with hairlines, a 4 px amber–black hazard stripe on the panel and popup, and the
  kicker "Emergency shelter finder" under the title. The home link is now an outlined button
  instead of an NTNU-blue pill. `color-scheme: dark`. Map symbology: the route is now
  emergency-exit green `#3ddc84` (was cyan), the same green as the passage buildings, the
  clicked point is white, and an out-of-range point is red. The collapsed mobile sheet is now
  117 px tall (measured), so the credit offset went from 108 to 128 px. At 390 px the credits
  end at y = 716 and the sheet starts at y = 727.
  `scripts/check-accessibility.js` passed against the built site (exit 0, no `FAIL`).
  Screenshots at 1600 and 390 px (start view, a route through Byhaven, the popup) were inspected.

Lint, format check, tests (12 files, 70 tests) and build pass after each commit.

Site build check (2026-11-05): the root `npm run site:build` was run and the result served under
the Pages prefix (`/TBA4565-Geomatics-Specialization-Course/trondheim-3d/`) with
`scripts/preview-site.mjs`. `data/building-passages.json` is in the build. With Playwright at
1600 × 900 a click at Brattøra gave a 1.69 km route "Through: Byhaven kjøpesenter (retail)" with
the building highlighted, and a fjord click gave the popup (553 m). At 390 × 844 a fjord click
gave the popup (654 m). No responses ≥ 400 and no console errors or warnings in any run.

Firefox check (2026-11-05): the same build and clicks in Playwright's Firefox 157 (WebGL through
ANGLE/Direct3D 11) gave the same results at 1600 × 900 and 390 × 844: the route through
Byhaven with the building highlighted, the popup at 553 m and 654 m with focus on "Try again",
and Escape closing it. The collapsed mobile sheet is 117 px tall, the same as in Chromium, and
the credits end above it. No responses ≥ 400 and no console errors. Firefox printed only
warnings: WebGL "lazy initialization" performance hints from Cesium's texture uploads and one
"Quirks Mode" warning for an `about:blank` frame. Screenshots at both widths were inspected.

Live check (2026-11-05): after the push, [Project 2 CI](https://github.com/progrimm/TBA4565-Geomatics-Specialization-Course/actions/runs/42110176134)
and the [Pages deploy](https://github.com/progrimm/TBA4565-Geomatics-Specialization-Course/actions/runs/42110176362)
succeeded. The same Chromium clicks on the live site (production token) gave the same results at
1600 × 900 and 390 × 844, with no responses ≥ 400 and no console errors or warnings.

Not verified: screen-reader announcement of the popup and Safari (no macOS or iOS device).

Rename (2026-11-08): the app is now **Trondheim Shelter Analysis** (was Trondheim 3D), with the
subtitle "Walking access to public shelters". The site path stays `/trondheim-3d/`, so existing
links keep working. Changed: the page `<title>` and description, the panel heading, the homepage
card, and the Overpass User-Agent (`trondheim-shelter-analysis`). The panel design is unchanged.
Lint, format check, tests (12 files, 70 tests) and build pass. After the root `npm run site:build`,
served under the Pages prefix, a Playwright round trip (homepage → app → "← My GIS module")
passed at 1600 × 900 and 390 × 844: `<title>` and panel heading read "Trondheim Shelter
Analysis", no console errors and no responses ≥ 400. Screenshots inspected: at 1600 px the title
wraps to two lines in the 268 px panel; at 390 px it fits on one line and the collapsed sheet
still starts below the credits.

Neutral design, map key and "How it works" (2026-11-08):

- **Design.** The crisis-tool look was replaced by a neutral dark analysis UI: grey panel
  (rgb(28 30 34), 92 %), light text, one blue accent `#6cb4ff` for links, switches, focus and
  buttons. Removed: the amber–black hazard stripe, the "Emergency shelter finder" kicker, the
  amber "3D" in the title and the uppercase monospace labels; headings are sentence case. The
  popup now reads "Outside the walking network" / "No path to a shelter" with a "Close" button.
  The out-of-range point is `#ff6b61` on the map and in the text (was `#ff5a4f`, which would fall
  below 4.5:1 on the new grey). The other map colours are unchanged. Contrast: see
  [Accessibility](#accessibility).
- **Map key** in the panel: shelter, route, building on the route, clicked point, out-of-range
  point, drawn from the same colours as the map (`config.js`).
- **"How it works"** and the **grid analysis** (see [How it works](#how-it-works)).
- **Verified** against the production build (`npx vite preview --port 4174`, personal token):
  - lint, format check, tests (14 files, 77 tests) and build pass;
  - `scripts/check-accessibility.js` exited 0 (new tab order, dialog focus, Tab stays inside,
    Escape closes and returns focus) and `scripts/check-failed-layers.js` exited 0 with no `FAIL`;
  - Playwright at 1600 × 900 and 390 × 844: a click on Torvet gave shelter no. 6870 (266 m walk,
    196 m straight at 1600 px; 265 m and 205 m at 390 px, a slightly different click point), a
    click at Brattøra gave the route through Byhaven kjøpesenter with the building highlighted,
    and fjord clicks gave the popup (456 m and 654 m). The sheet opened with dates
    "fetched 2026-10-28", "OSM data of 2026-10-27" and "OSM data of 2026-11-05" and the key results.
    No console errors and no responses ≥ 400. The collapsed mobile sheet is 116 px tall and
    starts at y = 728; the credits end at y = 716. Screenshots inspected.
- **Not verified:** screen-reader announcement of the dialog, Safari, and the live site (not
  pushed yet).

NN2000 heights from a geoid model, and a terrain check (2026-11-08):

- **Geoid model** HREF2025A cut to the study area (`npm run data:geoid`, `utils/geoidGrid.js`),
  bilinear interpolation in `utils/geoid.js`, 0.80 mm from Kartverket's transformation API at
  16 points. Camera targets are stored in NN2000 and converted with h = H + N; a ground click
  shows its NN2000 height. "How it works" lists the model and DTM 1 as data sources, explains
  h = H + N with the model's own numbers, and shows the terrain check.
- **Terrain check** (`scripts/check-terrain.js`): Cesium World Terrain − DTM 1 at 59 network
  points: mean +1.67 m, RMSE 8.03 m, largest 21.52 m (see [Terrain check](#terrain-check)).
- **Verified:** lint, format check, tests (15 files, 84 tests) and build pass;
  `check-accessibility.js` and `check-failed-layers.js` exited 0 with no `FAIL`; Playwright at
  1600 × 900 and 390 × 844 against the production build: the three presets with a crosshair
  (desktop: Torvet, the west front and Nedre Bakklandet centred), a Torvet click showing
  "Ground 0.9 m NN2000 (ellipsoidal 40.3 m − geoid 39.4 m)", and the sheet showing the model
  ("downloaded 2026-11-08"), DTM 1 ("queried 2026-11-08") and the terrain row. No console errors
  and no responses ≥ 400. Screenshots inspected.
- **Not verified:** the crosshair check at 390 px (the open sheet covers the centre of the
  view), and how Cesium World Terrain was made for Norway.

Coverage and capacity (2026-11-08):

- **Analysis** (`npm run analysis:coverage`): SSB 250 m population grid 2026 (1 045 cells,
  182 561 residents) joined to the shelters' service areas from one multi-source Dijkstra.
  26.3 % of residents live within 1 km on foot, 68.5 % within 2 km; 34.7 residents per shelter
  place, from 2.6 to 178.9 per place by catchment (see
  [Coverage and capacity](#coverage-and-capacity)). New pure code: `multiSourceDijkstra`,
  `utm33ToWgs84`, `utils/coverage.js`, each unit-tested (the multi-source result equals a
  single search from every node of the river fixture).
- **App:** "Walking distance" layer (off by default), its classes in the map key, a "Coverage"
  panel section, a "Whole study area" view, cell clicks that open the InfoBox and still run the
  nearest-shelter search, and "How it works" entries (SSB data source, two concepts, two result
  rows). `check-failed-layers.js` got a fifth case that blocks `coverage.json`.
- **Verified** against the production build: lint, format check, tests (16 files, 98 tests) and
  build pass; `check-accessibility.js` and `check-failed-layers.js` exited 0 with no `FAIL` (with
  `coverage.json` blocked: "Walking-distance layer could not be loaded.", the switch disabled
  as "Unavailable", the other layers and the search unchanged). Playwright at 1600 × 900 and
  390 × 844: the panel shows "182,561 residents … 34.7 per shelter place" and 7 / 26 / 68 %; with
  the layer on, a click near Torvet opened "91 residents (250 m cell)", walk 201 m, shelter
  no. 6870, and drew the route; the "Whole study area" view shows the whole layer; the SSB
  credit is in "Data attribution". No console errors or warnings and no responses ≥ 400.
  Screenshots inspected.
- **Not verified:** frame rate with the layer on (the benchmark covers the buildings only).

Walking time on slopes (2026-11-08):

- **Heights and times** (see [Walking time on slopes](#walking-time-on-slopes)): node heights from
  Kartverket's DTM via WCS (5 m; 0.10 m mean and at most 0.85 m from DTM 1 at 59 points),
  bridges and tunnels interpolated, Tobler's hiking function on directed edges. "Nearest" is now
  the fastest walk, with the shortest one listed when it leads elsewhere. Slopes make the
  shortest walk a median 5.2 % slower; at 2.8 % of the grid points the fastest shelter is
  another one; 52.6 % of residents live within 20 minutes of a shelter on foot.
- **New code:** `scripts/fetch-heights.js` (`npm run data:heights`), `scripts/overpass.js` (the
  Overpass helper, now shared with `fetch-passages.js`), `utils/walkingTime.js`,
  `utils/raster.js`, `wgs84ToUtm32`, edge-cost functions and `withHeights` in
  `utils/network.js`; the grid and coverage scripts report walking times too. All distance
  results are unchanged (checked: the earlier numbers in `analysis-summary.json` and
  `results/coverage-catchments.csv` did not change).
- **Verified** against the production build: lint, format check, tests (17 files, 108 tests) and
  build pass; `check-failed-layers.js` (six cases, now also asserting the walking time) and
  `check-accessibility.js` exited 0 with no `FAIL`; Playwright at 1600 × 900 and 390 × 844: a
  click at Torvet shows "266 m · 3 min (fastest, slopes included)" (264 m at 390 px), a coverage
  cell's InfoBox shows its fastest time, the "Coverage" section shows "18 % within 10 min, 53 %
  within 20 min", and "How it works" lists the terrain model, the Tobler concept and the
  "Slopes" and "Residents by time" rows (and 34.7 residents per place: the sheet used to print
  34.6 from the rounded value in the file; it now divides the counts). No console errors or
  warnings and no responses ≥ 400. Screenshots inspected.
- **Fixed:** the "Coverage and capacity" section was missing from this README after the step-3
  commit (a file path had been written in its place); it is restored above.
- **Not changed:** the view buttons. Removing them was started and reverted at your request,
  so Midtbyen, Nidarosdomen, Bakklandet and "Whole study area" stay.
- **Not verified:** the "Shortest" row in the browser. No browser click hit a point where the
  fastest and the nearest shelter differ; the logic is unit-tested and the example above is
  from Node.

Route check against OSRM (2026-11-08):

- **Script only** (`node scripts/validate-routes.js`): the app's shortest walks from 209 grid
  points compared with OSRM foot routes on FOSSGIS's server (one request per 1.1 s): median
  absolute difference 1.59 %, 90th percentile 6.14 %, 84.7 % within 5 % (see
  [Route check](#route-check-against-an-independent-router)). Two of the three largest
  differences were inspected; one comes from a short connection missing in the app's snapshot,
  the other is not explained.
- **App:** "How it works" shows a "Route check" row and a limitation about the snapshot.
- **Verified:** lint, format check, tests (17 files, 108 tests) and build pass; Playwright at
  1600 × 900 and 390 × 844 shows the new row in the sheet with no console errors.
