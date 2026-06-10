import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds the standalone <status-map> custom element bundle for embedding
// into other pages (e.g. life-dashboard). See src/embed.tsx and embed-demo.html.
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist-embed',
    cssCodeSplit: false,
    lib: {
      entry: 'src/embed.tsx',
      name: 'StatusMap',
      formats: ['iife'],
      fileName: () => 'status-map.js',
    },
  },
});
