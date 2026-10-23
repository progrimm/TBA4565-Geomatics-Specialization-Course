import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// CesiumJS loads Workers, Assets, Widgets and ThirdParty files at runtime,
// so they must be served as static files next to the bundle.
const cesiumSource = 'node_modules/cesium/Build/Cesium';
const cesiumBaseUrl = 'cesium';

export default defineConfig({
  // Relative base so the build works on sub-path hosting (e.g. GitHub Pages).
  base: './',
  define: {
    CESIUM_BASE_URL: JSON.stringify(`./${cesiumBaseUrl}`),
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: ['Workers', 'Assets', 'Widgets', 'ThirdParty'].map((dir) => ({
        src: `${cesiumSource}/${dir}`,
        dest: cesiumBaseUrl,
        // Strip "node_modules/cesium/Build/Cesium" so files land in cesium/<dir>/.
        rename: { stripBase: 4 },
      })),
    }),
  ],
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
