import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/tempo-app/',
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './src/tests/setup.js',
    pool: 'threads',
    minWorkers: 1,
    maxWorkers: 1,
    include: ['src/tests/**/*.{test,spec}.{js,jsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/tests/**', 'src/main.jsx'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          leaflet: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})
