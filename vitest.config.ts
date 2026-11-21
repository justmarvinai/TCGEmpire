import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['supabase/tests/**/*.test.ts', 'src/**/*.test.ts', 'art/**/*.test.ts', 'scripts/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
