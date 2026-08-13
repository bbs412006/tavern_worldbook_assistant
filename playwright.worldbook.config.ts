import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/worldbook_assistant_build/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4188',
    browserName: 'chromium',
    headless: true,
    launchOptions: {
      executablePath: '/opt/hermes/.playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',
    },
  },
  webServer: {
    command: 'python3 -m http.server 4188 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4188/tests/worldbook_assistant_build/e2e/host.html',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
