// ArcGIS Maps SDK for JavaScript, GaussianSplatLayer (since 5.0), qualitative only:
// https://developers.arcgis.com/javascript/latest/references/core/layers/GaussianSplatLayer/
// It loads Esri's public sample layer, not the shared test splat, so it is not
// benchmarked. SDK assets (workers, styles) come from Esri's CDN (js.arcgis.com).
import '@arcgis/core/assets/esri/themes/dark/main.css';
import Map from '@arcgis/core/Map.js';
import GaussianSplatLayer from '@arcgis/core/layers/GaussianSplatLayer.js';
import SceneView from '@arcgis/core/views/SceneView.js';
import { ARCGIS_SAMPLE } from './config.js';
import { createLabPage } from './harness.js';

const page = createLabPage({
  title: 'ArcGIS Maps SDK',
  engine: 'ArcGIS Maps SDK for JavaScript 5.1.27, GaussianSplatLayer in a SceneView',
  credit: 'ArcGIS Maps SDK: Esri Master License Agreement. Not benchmarked: different splat.',
  createCanvas: false,
  splatCredit: ARCGIS_SAMPLE.credit,
});

try {
  page.status('Loading the Esri sample layer…');
  const layer = new GaussianSplatLayer({ portalItem: { id: ARCGIS_SAMPLE.portalItemId } });
  const view = new SceneView({
    container: page.stage,
    map: new Map({ basemap: ARCGIS_SAMPLE.basemap, ground: 'world-elevation', layers: [layer] }),
  });
  await view.when();
  await layer.load();
  // An oblique view shows the splat as 3D content, not just as a top-down image.
  await view.goTo({ target: layer.fullExtent, tilt: ARCGIS_SAMPLE.tiltDeg });
  page.status(`Loaded "${layer.title}".`);
} catch (error) {
  page.fail(error);
}
