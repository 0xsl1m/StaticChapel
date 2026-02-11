import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: false,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  },
  assetsInclude: ['**/*.mp3', '**/*.wav']
});
