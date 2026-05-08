import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // VITE_BASE_URL is set in GitHub Actions to /repo-name/
  // locally it's '/' (default)
  base: process.env.VITE_BASE_URL || '/',
  server: {
    port: 5173,
    proxy: {
      // In dev, proxy /birdnet → localhost BirdNET server
      // In prod, VITE_BIRDNET_URL points directly to Render
      '/birdnet': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/birdnet/, ''),
      },
    },
  },
})
