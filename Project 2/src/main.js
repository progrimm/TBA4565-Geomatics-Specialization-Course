import './style.css';
import { CESIUM_TOKEN, CAMERA_VIEWS } from './config.js';
import { configureIon, createViewer } from './viewer.js';
import { createTerrain } from './layers/terrain.js';
import { toCameraOptions } from './utils/camera.js';

configureIon(CESIUM_TOKEN);
const viewer = createViewer('cesiumContainer', { terrain: createTerrain() });
viewer.camera.setView(toCameraOptions(CAMERA_VIEWS.trondheimCentre));
