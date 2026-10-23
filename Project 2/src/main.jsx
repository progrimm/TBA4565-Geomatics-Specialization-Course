// CSS order matters: our styles must come after Cesium's to override them.
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CESIUM_TOKEN } from './config.js';
import { configureIon } from './viewer.js';
import App from './App.jsx';

// Global one-time setup: must run before any ion asset is requested.
configureIon(CESIUM_TOKEN);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
