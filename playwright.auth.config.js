import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';
import academy from './playwright.academy.config.js';

export default defineConfig({
    ...academy,
    testMatch: 'authFailClosed.browser.spec.js',
    outputDir: path.join(os.tmpdir(), 'autosporting-auth-fixed-playwright'),
});
