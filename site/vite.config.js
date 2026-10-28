import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base: the homepage is served from the repo's Pages root
  // (https://<user>.github.io/<repo>/), and the apps sit in subfolders next to it.
  base: './',
});
