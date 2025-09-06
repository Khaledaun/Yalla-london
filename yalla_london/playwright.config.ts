
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for staging E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.STAGING_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global test timeout */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  /* Expect options */
  expect: {
    /* Maximum time expect() should wait for the condition to be met */
    timeout: 10000,
    
    /* Take screenshots on assertion failures */
    toHaveScreenshot: { 
      threshold: 0.2,
      animation: 'disabled'
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.spec\.ts/
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /.*\.spec\.ts/
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /.*mobile.*\.spec\.ts/
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: /.*mobile.*\.spec\.ts/
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
      testMatch: /.*\.spec\.ts/
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
      testMatch: /.*\.spec\.ts/
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global test setup */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  
  /* Global test teardown */
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  /* Output folder for test results */
  outputDir: 'test-results/',
  
  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  testDir: './tests',
  
  /* Maximum time one test can run for */
  timeout: 30 * 1000,
  
  /* Test file patterns */
  testMatch: [
    '**/*.{test,spec}.{js,jsx,ts,tsx}',
    '**/tests/**/*.spec.ts'
  ],
  
  /* Files to ignore */
  testIgnore: [
    '**/node_modules/**',
    '**/build/**',
    '**/.next/**'
  ]
});
