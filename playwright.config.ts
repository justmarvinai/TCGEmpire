import { defineConfig, devices } from '@playwright/test'

// End-to-end smoke tests run against the production build in local mode:
// the real server SQL runs inside the browser, no backend needed.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  // Local mode boots a whole Postgres in the browser: the first screen takes a few seconds.
  expect: { timeout: 20_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'off' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 180_000,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
})
