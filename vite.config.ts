import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // PGlite (local mode) ships its own WASM; let Vite serve it untouched.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  server: { port: 5173 },
  preview: { port: 4173 },
})
