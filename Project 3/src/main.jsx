// CSS order matters: our styles must come after Cesium's to override them.
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CESIUM_TOKEN, ITWIN_SHARE_KEY } from './config.js';
import { configureIon, configureITwin } from './viewer.js';
import App from './App.jsx';

// Global one-time setup: must run before any ion asset is requested.
configureIon(CESIUM_TOKEN);
configureITwin(ITWIN_SHARE_KEY);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
