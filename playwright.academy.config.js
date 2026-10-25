import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
    testDir: './tests',
    testMatch: 'academy.spec.js',
    outputDir: path.join(os.tmpdir(), 'autosporting-academy-playwright'),
    workers: 1,
    reporter: 'list',
    use: { baseURL: process.env.ACADEMY_BASE_URL || 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
        { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'chrome' } },
    ],
    webServer: process.env.ACADEMY_BASE_URL ? undefined : {
        command: 'npm run start -- --hostname 127.0.0.1 --port 3100',
        url: 'http://127.0.0.1:3100/login',
        reuseExistingServer: false,
        timeout: 60000,
    },
});
