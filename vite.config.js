import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    // Everything is inlined into the one file, so there is nothing to preload.
    // The polyfill would otherwise leave a fetch() in an artefact that is
    // supposed to touch the network for nothing but fonts.
    modulePreload: false,
  },
});
