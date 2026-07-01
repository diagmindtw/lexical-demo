import { defineConfig, devices } from '@playwright/test'

// e2e runs against the production build served by `vite preview` (base
// /lexical-demo/). The canvas-parity test proves the editor behaves
// identically with the particle canvas on vs off.
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4271/lexical-demo/',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview -- --port 4271 --strictPort',
    url: 'http://localhost:4271/lexical-demo/',
    reuseExistingServer: false,
    timeout: 60000,
  },
})
