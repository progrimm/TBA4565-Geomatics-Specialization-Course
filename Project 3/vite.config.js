import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the build works on sub-path hosting (GitHub Pages /3dgs-viewer/).
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
