import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so tests don't load the Cesium plugin.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
