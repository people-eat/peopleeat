import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Vitest is intentionally split from `vite.config.ts`. The dev/build config
// loads the full TanStack Start + Nitro + React plugin stack, which Vitest 4 +
// Vite 8's module runner cannot evaluate against React's CJS entry — every
// test file ate a `ReferenceError: module is not defined` at startup before
// this split.
//
// We define two projects with disjoint plugin sets:
//
//   server — Node environment, no plugins. Covers `src/server/**/*.test.ts`
//            (commands, queries, mappers, utils), `src/shared/**/*.test.ts`
//            (isomorphic locale/format helpers), and `scripts/**/*.test.ts`
//            (ETL helpers). Pure TS, no JSX, no DOM.
//
//   web    — jsdom environment, `@vitejs/plugin-react` for the JSX runtime.
//            Covers `src/web/**/*.test.{ts,tsx}` and any future component or
//            hook tests. Uses `@testing-library/react` (already a devDep).
//
// Both projects share `src/server/test/vitestSetup.ts` for the global
// console-spy setup; the web project layers its own jsdom-aware setup on top.
export default defineConfig({
    test: {
        projects: [
            {
                resolve: { tsconfigPaths: true },
                // Stub the build-time define so modules that reference
                // `__SITE_LAST_MODIFIED__` (notably JSON-LD builders) compile and run
                // under Vitest without needing a real git checkout. Per-project:
                // Vitest project configs do not inherit the root `define`.
                define: {
                    __SITE_LAST_MODIFIED__: JSON.stringify('2026-01-01T00:00:00Z'),
                },
                test: {
                    name: 'server',
                    environment: 'node',
                    include: ['src/server/**/*.test.{ts,tsx}', 'src/shared/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,tsx}'],
                    setupFiles: ['src/server/test/vitestSetup.ts'],
                    clearMocks: true,
                    // Remote shared test DB + lifecycle side effects (email/WhatsApp) under parallel load.
                    testTimeout: 30_000,
                },
            },
            {
                resolve: { tsconfigPaths: true },
                plugins: [viteReact()],
                define: {
                    __SITE_LAST_MODIFIED__: JSON.stringify('2026-01-01T00:00:00Z'),
                },
                test: {
                    name: 'web',
                    environment: 'jsdom',
                    include: ['src/web/**/*.test.{ts,tsx}', 'src/routes/**/*.test.{ts,tsx}'],
                    setupFiles: ['src/server/test/vitestSetup.ts', 'src/web/test/vitestSetup.ts'],
                    clearMocks: true,
                },
            },
        ],
    },
});
