import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Identifiant unique de ce build, injecté dans le bundle ET exposé via
// /version.json. Le client compare son __BUILD_ID__ embarqué à la version
// servie par Vercel pour détecter une nouvelle livraison et forcer un reload.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.GIT_COMMIT
  || String(Date.now())

function emitVersionJson() {
  return {
    name: 'emit-version-json',
    apply: 'build',
    closeBundle() {
      const out = resolve(process.cwd(), 'dist', 'version.json')
      writeFileSync(out, JSON.stringify({ buildId: BUILD_ID }))
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [react(), emitVersionJson()],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
    pool: 'threads',
    minWorkers: 1,
    maxWorkers: 2,
    testTimeout: 5000,
    hookTimeout: 5000,
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
          supabase: ['@supabase/supabase-js'],
          leaflet: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})
