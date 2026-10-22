// CSS order matters: our styles must come after Cesium's to override them.
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import { CESIUM_TOKEN, CAMERA_VIEWS, MOBILE_QUERY, SHELTERS } from './config.js';
import { configureIon, createViewer } from './viewer.js';
import { createTerrain } from './layers/terrain.js';
import { addBuildings } from './layers/buildings.js';
import { addShelters } from './layers/shelters.js';
import { toCameraOptions } from './utils/camera.js';
import { initPanel } from './ui/panel.js';
import { renderViewButtons } from './ui/views.js';
import { addLayerToggle } from './ui/layerToggles.js';

configureIon(CESIUM_TOKEN);
const viewer = createViewer('cesiumContainer', { terrain: createTerrain() });
viewer.camera.setView(toCameraOptions(CAMERA_VIEWS.trondheimCentre));

initPanel(document.getElementById('panel-toggle'), MOBILE_QUERY);
renderViewButtons(document.getElementById('view-buttons'), viewer.camera, CAMERA_VIEWS);

const layerList = document.getElementById('layer-toggles');
addLayerToggle(layerList, viewer.scene, { label: 'Buildings', layer: addBuildings(viewer) });
addLayerToggle(layerList, viewer.scene, {
  label: 'Public shelters',
  layer: addShelters(viewer),
  swatch: SHELTERS.style.color,
});
