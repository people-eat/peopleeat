import { config } from 'dotenv';
import { vi } from 'vitest';

import { environmentVariablesTestSource } from '../env/environmentVariablesTestSource';

// Load `.env.test` when present, then fill any missing boot-required keys from
// the shared test source (console email/Slack transports). CI already sets a
// full env; local runs with a sparse `.env.test` still boot-validate cleanly.
// Prefer `.env.test` over Vite-loaded `.env.local` (localhost) so integration
// tests hit the test database. CI sets env in the workflow; when `.env.test`
// is absent this is a no-op.
config({ path: ['.env.test'], override: true });
for (const [key, value] of Object.entries(environmentVariablesTestSource())) {
    // Never invent a DATABASE_URL — a placeholder host hangs the suite.
    // Integration tests need a real URL from `.env.test` / CI.
    if (key === 'DATABASE_URL') continue;
    // eslint-disable-next-line no-restricted-syntax -- test harness seeds process.env for boot validation
    if (process.env[key] === undefined && value !== undefined) {
        // eslint-disable-next-line no-restricted-syntax
        process.env[key] = value;
    }
}

// reCAPTCHA is always required at boot; gift-card commands verify on every
// create. Stub Google siteverify so command tests never hit the network.
// `verifyRecaptchaV3.test.ts` replaces `fetch` for its own cases.
const realFetch = globalThis.fetch.bind(globalThis);
vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('recaptcha/api/siteverify')) {
        return new Response(JSON.stringify({ success: true, score: 0.9, action: 'gift_card_purchase' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return realFetch(input, init);
});

// Globally silence and observe `console.*` for every test in this project.
//
// `loggerCreate` echoes every persisted log line to `console[level]` so that
// errors are still visible in production stdout. In tests, that pollutes the
// reporter output with stack traces from negative-path assertions (a test
// that proves the command rejects an empty name will, by design, log an
// error). Globally spying lets tests assert on calls (`expect(console.error)
// .toHaveBeenCalledWith(...)`) without touching the real terminal.
//
// `clearMocks: true` in `vite.config.ts` resets `.mock.calls` between tests,
// so the spies never need to be restored manually. The implementation stays
// a no-op for the whole run.
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});
