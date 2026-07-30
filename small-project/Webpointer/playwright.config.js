const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/report.json' }]
  ],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1280, height: 800 }
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled'
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npx http-server . -p 8080 -c-1',
    port: 8080,
    reuseExistingServer: true,
    timeout: 10000
  }
});
