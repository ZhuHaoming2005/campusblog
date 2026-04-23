import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Shared D1-backed fixtures require serialized e2e runs in local and CI environments. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    env: {
      ...process.env,
      AUTH_EMAIL_DEBUG: process.env.AUTH_EMAIL_DEBUG ?? 'false',
      AUTH_EMAIL_FROM_ADDRESS:
        process.env.AUTH_EMAIL_FROM_ADDRESS ?? 'noreply@mail.campusblog.net',
      AUTH_EMAIL_FROM_NAME: process.env.AUTH_EMAIL_FROM_NAME ?? 'CampusBlog',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      PAYLOAD_PUBLIC_SERVER_URL: process.env.PAYLOAD_PUBLIC_SERVER_URL ?? 'http://localhost:3000',
    },
    reuseExistingServer: true,
    url: 'http://localhost:3000',
  },
})
