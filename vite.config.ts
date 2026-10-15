import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH lets the static build live under a sub-path (e.g. GitHub Pages: /album-visualizer/).
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/',
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { chunkSizeWarningLimit: 2000, sourcemap: false },
})
