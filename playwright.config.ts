import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  timeout: 35_000,
  use: {
    baseURL: 'http://127.0.0.1:4373',
    launchOptions: process.env.PIXFORGE_CHROMIUM_PATH
      ? { executablePath: process.env.PIXFORGE_CHROMIUM_PATH } : undefined,
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4373 --strictPort',
    url: 'http://127.0.0.1:4373',
    reuseExistingServer: !process.env.CI,
  },
});
