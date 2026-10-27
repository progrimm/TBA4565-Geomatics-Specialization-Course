/**
 * App-wide constants. No magic numbers elsewhere in the code.
 */

/** Cesium ion token, injected by Vite from .env (VITE_CESIUM_TOKEN). */
export const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_TOKEN;

/** Media query for the mobile layout. Keep in sync with the breakpoint in style.css. */
export const MOBILE_QUERY = '(max-width: 640px)';

/**
 * Opening view: the whole globe, centred on the North Atlantic so that the US and
 * European splats are both visible. WGS84 lon/lat in degrees, height in metres
 * above the WGS84 ellipsoid.
 */
export const GLOBE_VIEW = {
  longitude: -40,
  latitude: 38,
  height: 16_000_000,
  // A portrait phone screen is narrow: back off so the whole globe fits.
  mobileHeight: 24_000_000,
  heading: 0,
  pitch: -90,
};

/**
 * Tileset settings shared by all splats. maximumScreenSpaceError (SSE, in pixels)
 * controls when a tile is refined: lower = sharper but more tiles; Cesium default is 16.
 */
export const SPLAT_TILESET_SETTINGS = {
  maximumScreenSpaceError: 8,
};

/** Markers are hidden closer than this (metres), where the splat itself is visible. */
export const MARKER_HIDE_DISTANCE = 8000;

/**
 * Public iTwin share key from Cesium's "iTwin Gaussian Splats" Sandcastle example
 * (CesiumGS/cesium 1.146, packages/sandcastle/gallery/itwin-gaussian-splats). It
 * grants read access to that one iTwin and expires 2026-12-01 05:13 UTC (JWT `exp`).
 */
export const ITWIN_SHARE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpVHdpbklkIjoiMDRiYTcyNWYtZjNjMC00ZjMwLTgwMTQtYTQ0ODhjYmQ2MTJkIiwiaWQiOiI3ZDVjN2FmNy1hYTZlLTQwYWYtYmJlOC1iZDBjNTQ0NTAzNGQiLCJleHAiOjE3OTYxMDIwMTR9.lAMXet_oZeIR-fpGMlawsBNrEj1CNTGK7WiRWQZCcs8';

/**
 * Gallery of georeferenced Gaussian splats (3D Tiles with glTF splat content).
 *
 * `marker` is only where the globe marker sits before the tileset is loaded. It is
 * the root-transform origin decoded from each tileset.json on 2026-10-27 (WGS84
 * degrees). Once loaded, the camera and the inspector use the tileset itself.
 * Places were identified from that origin with OpenStreetMap (Nominatim reverse
 * geocoding and named OSM features at the origin).
 *
 * Every ion asset here is public but owned by Cesium's own account (not in the
 * Asset Depot), so it is requested with Cesium's evaluation token (see README).
 *
 * @typedef {{type: 'ion', assetId: number} |
 *   {type: 'itwin', iTwinId: string, realityDataId: string}} SplatSource
 * @typedef {object} Splat
 * @property {string} id
 * @property {string} label
 * @property {string} place
 * @property {string} country
 * @property {{longitude: number, latitude: number}} marker
 * @property {SplatSource} source
 * @property {string} capture - who captured it and how, as far as a source states it.
 * @property {string} dataType
 * @property {string} credits
 * @property {{assetId: number, label: string}} [mesh] - triangle mesh of the same scene.
 * @property {[number, number, number]} [offset] - suggested ECEF translation in metres.
 */

/** @type {Splat[]} */
export const SPLATS = [
  {
    id: 'redmond',
    label: 'Microsoft campus',
    place: 'Redmond, Washington',
    country: 'USA',
    marker: { longitude: -122.1319, latitude: 47.64785 },
    source: { type: 'ion', assetId: 4547222 },
    capture:
      'Bentley Systems with Cesium: 20,169 drone photos, ~3.7 km², 3 cm GSD, 110 million splats',
    dataType: '3D Tiles 1.0, glTF splats, hierarchical LOD',
    credits: 'Cesium ion asset 4547222 (public sample), captured with Bentley Systems',
  },
  {
    id: 'boathouse',
    label: 'Hines Rowing Center',
    place: 'Whitemarsh Township, Pennsylvania',
    country: 'USA',
    marker: { longitude: -75.29163, latitude: 40.07232 },
    source: { type: 'ion', assetId: 3667783 },
    capture: 'Not stated (Cesium sample "3D Gaussian splatting Sample Data - Boathouse")',
    dataType: '3D Tiles 1.1, glTF splats',
    credits: 'Cesium ion asset 3667783 (public CesiumJS sample)',
  },
  {
    id: 'substation',
    label: 'RTE substation',
    place: 'Boulieu-lès-Annonay, Ardèche',
    country: 'France',
    marker: { longitude: 4.66873, latitude: 45.26519 },
    source: { type: 'ion', assetId: 3667784 },
    capture: 'Not stated (Cesium sample "3D Gaussian splatting Sample Data - Gaussian Splats")',
    dataType: '3D Tiles 1.1, glTF splats; triangle mesh of the same scene',
    credits: 'Cesium ion assets 3667784 (splats) and 3443919 (mesh), public CesiumJS samples',
    mesh: { assetId: 3443919, label: 'Photogrammetry mesh' },
  },
  {
    id: 'dam',
    label: "O'Shaughnessy Dam",
    place: 'Dublin, Ohio',
    country: 'USA',
    marker: { longitude: -83.12531, latitude: 40.1541 },
    source: {
      type: 'itwin',
      iTwinId: '04ba725f-f3c0-4f30-8014-a4488cbd612d',
      realityDataId: '4afd5d69-3ba7-491d-86cd-3d86d43db907',
    },
    capture: 'Bentley iTwin reality data "GSI_DAM_3Dtiles" (capture method not stated)',
    dataType: '3D Tiles 1.1, glTF splats (iTwin type GS_3DT)',
    credits: 'Bentley iTwin Platform reality data, shared publicly by Cesium (Sandcastle)',
    // Cesium's Sandcastle example translates this tileset by (-1, 9, -8) m in ECEF
    // to sit on Cesium World Terrain. The alignment check can switch it on and off.
    offset: [-1, 9, -8],
  },
];
