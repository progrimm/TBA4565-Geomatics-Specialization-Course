// Qualitative comparison of the viewers. Sources (official docs, checked
// 2026-10-27) are listed in the project README under "Viewer lab".

/** Table columns, in order. */
export const COMPARISON_COLUMNS = [
  { key: 'viewer', label: 'Viewer' },
  { key: 'licence', label: 'Licence' },
  { key: 'engine', label: 'Engine' },
  { key: 'formats', label: 'Formats' },
  { key: 'lod', label: 'LOD and streaming' },
  { key: 'georef', label: 'Georeferencing and CRS' },
  { key: 'gis', label: 'GIS features' },
  { key: 'mobile', label: 'Mobile (390 px)' },
  { key: 'docs', label: 'Documentation' },
  { key: 'lines', label: 'Integration lines' },
];

/** One row per viewer; `lines` is filled in from results/viewer-static.csv. */
export const COMPARISON = [
  {
    id: 'spark',
    viewer: 'Spark 2.4.0',
    licence: 'MIT',
    engine: 'Three.js (WebGL2)',
    formats: 'PLY (incl. compressed), SPZ, SOG, SPLAT, KSPLAT, RAD',
    lod: 'Optional (lod: true, built in a worker); paged streaming of chunked .rad files',
    georef:
      'None: local scene coordinates; the PLY is y-down (OpenCV) and is re-oriented by the app',
    gis: 'None built in',
    mobile: 'Renders at 390 px (emulated); touch orbit not tested',
    docs: 'Dedicated docs site with guides and examples',
  },
  {
    id: 'playcanvas',
    viewer: 'PlayCanvas 2.23.3',
    licence: 'MIT',
    engine: 'PlayCanvas engine (WebGL2/WebGPU)',
    formats: 'PLY (incl. compressed), SOG, streamed SOG, GLB, SPZ',
    lod: 'Streamed SOG: chunked spatial tree with LOD levels',
    georef: 'None: local scene coordinates; splat turned 180° about z by the app',
    gis: 'None built in',
    mobile: 'Renders at 390 px (emulated); touch orbit not tested',
    docs: 'User manual plus many engine examples',
  },
  {
    id: 'babylon',
    viewer: 'Babylon.js 9.32.1',
    licence: 'Apache 2.0',
    engine: 'Babylon.js (WebGL2/WebGPU)',
    formats: 'PLY (incl. compressed), SPLAT, SPZ, SOG, glTF KHR_gaussian_splatting',
    lod: 'Streamed SOG with LOD (lod-meta.json), memory and splat budgets',
    georef:
      'None: local scene coordinates, left-handed by default; the app negates y in the camera poses',
    gis: 'None built in',
    mobile: 'Renders at 390 px (emulated); touch orbit not tested',
    docs: 'One deep-dive page plus Playground examples',
  },
  {
    id: 'cesium',
    viewer: 'CesiumJS 1.146.0 (gallery)',
    licence: 'Apache 2.0',
    engine: 'CesiumJS (WebGL2)',
    formats: '3D Tiles with glTF KHR_gaussian_splatting (+ SPZ compression)',
    lod: 'Hierarchical 3D Tiles LOD, streamed by screen-space error',
    georef: 'Tileset root transform to ECEF (EPSG:4978); WGS 84 globe',
    gis: 'Terrain, imagery, OSM Buildings, measurement, swipe (see the gallery)',
    mobile: 'Gallery works at 390 px (session 6)',
    docs: 'API reference plus Sandcastle examples',
  },
  {
    id: 'arcgis',
    viewer: 'ArcGIS Maps SDK 5.1.27',
    licence: 'Proprietary (Esri Master License Agreement)',
    engine: 'ArcGIS SceneView (WebGL2)',
    formats: 'GaussianSplatLayer from a scene service or portal item (3D Tiles)',
    lod: 'Streamed scene service',
    georef: 'Georeferenced layer in a global or local SceneView',
    gis: 'Basemap, elevation and 3D analysis widgets; some analyses unsupported on splats (API reference)',
    mobile: 'Renders at 390 px (emulated); map widgets cover much of the view',
    docs: 'API reference plus samples',
  },
];
