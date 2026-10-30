import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.test' });
config({ path: '.env.local', override: true });

const baseURL = (process.env.WEB_PAGE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const isCi = Boolean(process.env.CI);

export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.spec.ts',
    // Specs seed with nanoIds (no truncate), so workers can share one Postgres safely.
    // Local stays single-worker for quieter logs; CI uses two against the service container.
    fullyParallel: true,
    forbidOnly: isCi,
    retries: isCi ? 1 : 0,
    workers: isCi ? 2 : 1,
    reporter: isCi ? [['list'], ['html', { open: 'never' }]] : 'list',
    timeout: 60_000,
    expect: { timeout: 15_000 },
    use: {
        ...devices['Desktop Chrome'],
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'npm run dev -- --port 3000',
        url: baseURL,
        reuseExistingServer: !isCi,
        timeout: 120_000,
        env: Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)),
    },
});
