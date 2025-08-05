import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, 'manifest.json'),
          dest: '.',
        },
        {
          src: path.resolve(__dirname, 'icon.png'),
          dest: '.',
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
  }
});
