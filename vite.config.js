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
    exclude: [
      'e2e/**',
      'node_modules/**',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/tests/**', 'src/main.jsx'],
    },
  },
  build: {
    // Minification esbuild complète réactivée.
    // Historique : `minifyIdentifiers: false` avait été posé (PR #28) pour
    // débugger une TDZ "Cannot access 'R' before initialization". Le vrai
    // bug a été trouvé (PR #30 : `data` lu avant `const data = useCompanyData`
    // dans EntrepriseApp.jsx) et un scan statique confirme 0 pattern TDZ
    // restant. On récupère ~20 % de gzip.
    // On garde `keepNames: true` pour que les noms de fonctions/classes
    // restent lisibles dans les stacks (aide Sentry).
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          leaflet: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
  esbuild: {
    keepNames: true,
  },
})
