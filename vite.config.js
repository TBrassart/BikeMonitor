import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // On redirige tout ce qui commence par /api-spokes vers 99spokes
      '/api-spokes': {
        target: 'https://api.99spokes.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-spokes/, ''),
        secure: false,
      }
    }
  }
})