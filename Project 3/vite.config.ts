import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

// vite-plugin-cesium serves Cesium's Workers/Assets/Widgets/ThirdParty in dev,
// copies them into the build output, and sets CESIUM_BASE_URL accordingly.
export default defineConfig({
  plugins: [react(), cesium()],
});
