import { config } from 'dotenv';

import { environmentVariablesTestSource } from '../src/server/env/environmentVariablesTestSource';

// Load test defaults first, then `.env.local` with override so sessionCookieName
// matches `npm run dev` (Vite reads `.env.local`). CI sets env vars before
// dotenv runs; dotenv never overwrites existing process.env keys unless
// `override: true` — so CI values stay intact when files are absent.
config({ path: '.env.test' });
config({ path: '.env.local', override: true });

// Fill gaps so Playwright's webServer can boot with always-required env when
// local `.env*` files are sparse. Does not override keys already set above.
for (const [key, value] of Object.entries(environmentVariablesTestSource())) {
    if (key === 'DATABASE_URL') continue;
    if (process.env[key] === undefined && value !== undefined) {
        process.env[key] = value;
    }
}

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`e2e: missing required environment variable ${name}`);
    }
    return value;
}

export const e2eEnv = {
    databaseUrl: required('DATABASE_URL'),
    sessionCookieName: required('sessionCookieName'),
    webPageUrl: (process.env.WEB_PAGE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
};
