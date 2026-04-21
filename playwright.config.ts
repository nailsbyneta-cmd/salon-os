import { defineConfig, devices } from '@playwright/test';

// ─── Playwright-Config für E2E + a11y-Gate ───────────────────
//
// Golden-Paths laut UPGRADE-PLAN Block A #1 / 1d:
//   1. Public-Booking-Seite lädt + a11y-clean
//   2. Login (kommt mit WorkOS-Magic-Link)
//   3. Create-Appointment (kommt mit Admin-Login)
//   4. Cancel-Appointment
//   5. POS-Checkout
//
// Aktueller Stand: nur #1, weitere folgen inkrementell. Jeder Test führt
// nach erfolgreicher Navigation eine axe-core-Analyse durch → 0 Violations
// auf Level AA ist harte Gate-Bedingung.

const WEB_PORT = Number(process.env['WEB_PORT'] ?? 3000);
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env['E2E_SKIP_WEBSERVER']
    ? undefined
    : {
        command: 'pnpm --filter @salon-os/web dev',
        url: WEB_URL,
        reuseExistingServer: !process.env['CI'],
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
