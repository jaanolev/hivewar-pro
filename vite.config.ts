import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split the heaviest deps into their own chunks so the browser
        // downloads them in parallel and caches them across deploys.
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'konva-vendor': ['konva', 'react-konva'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
