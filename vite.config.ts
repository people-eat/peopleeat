import { execSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';

import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

// Last commit date in ISO-8601 form, injected as `__SITE_LAST_MODIFIED__`
// so SEO JSON-LD (`dateModified`) and other freshness signals reflect when
// the site code last changed. Falls back to now when git is unavailable.
const siteLastModified = (() => {
    try {
        return execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim();
    } catch {
        return new Date().toISOString();
    }
})();

// Nitro's vite dev middleware classifies a request as a static asset when
// `Sec-Fetch-Dest` is anything other than `document` / `iframe` / `frame`,
// and routes assets through Vite's static pipeline before the Nitro handler
// ever runs. Browsers send `Sec-Fetch-Dest: image` for `<img src=…>`, which
// means our same-origin `/api/attachments/<id>` route gets diverted into the
// asset pipeline and answered with Vite's generic `Cannot GET …` HTML 404.
//
// We strip the header for `/api/*` paths in dev so those requests fall
// through to Nitro and reach our route handler. This plugin only mounts in
// `serve` mode — production builds skip Vite's middleware entirely, so the
// patch isn't shipped.
const apiSecFetchDestStrip = (): Plugin => ({
    name: 'api-sec-fetch-dest-strip',
    apply: 'serve',
    configureServer(server) {
        server.middlewares.use((req, _res, next) => {
            if (req.url && req.url.startsWith('/api/') && req.headers['sec-fetch-dest']) {
                delete req.headers['sec-fetch-dest'];
            }
            next();
        });
    },
});

// Passkeys pull `@simplewebauthn/server` → `@peculiar/x509` → `tsyringe`, which
// throws unless `Reflect.getMetadata` exists. `@simplewebauthn/server` does
// `import 'reflect-metadata'` before `@peculiar/x509` in source, but Nitro's
// SSR rollup puts CJS `reflect-metadata` in the *importer* chunk body while
// `@peculiar/x509` stays a static ESM import of a sibling chunk — so
// `tsyringe` evaluates first and every SSR `loadEntries()` dies with
// "tsyringe requires a reflect polyfill". Inject the polyfill into
// `tsyringe`'s entry so it is bundled *into* the x509+tsyringe chunk and
// runs before the Reflect check.
const reflectMetadataForTsyringe = (): Plugin => ({
    name: 'reflect-metadata-for-tsyringe',
    transform(code, id) {
        const normalized = id.replaceAll('\\', '/');
        if (!normalized.includes('/tsyringe/dist/') || !normalized.endsWith('/index.js')) {
            return null;
        }
        if (code.includes('reflect-metadata')) {
            return null;
        }
        return {
            code: `import 'reflect-metadata';\n${code}`,
            map: null,
        };
    },
});

const config = defineConfig({
    resolve: { tsconfigPaths: true },
    define: {
        __SITE_LAST_MODIFIED__: JSON.stringify(siteLastModified),
    },
    // Docs are not part of the module graph. Ignore them so markdown edits
    // do not wake Vite's watcher (belt-and-suspenders with Tailwind's
    // `@source not "../docs"` in `src/styles.css`).
    server: {
        watch: {
            ignored: ['**/docs/**'],
        },
    },
    // Test configuration lives in `vitest.config.ts` — Vitest 4 + Vite 8's
    // module runner cannot evaluate React's CJS entry through the full
    // TanStack Start plugin stack, so the test config defines its own
    // server/web projects with disjoint plugin sets.
    //
    // Playwright drives a separately-installed Chromium binary and loads
    // chromium-bidi via internal paths Vite cannot statically resolve. It
    // must stay external on both the dev server (optimizeDeps) and the
    // production nitro bundle (rollup external) — the runtime image
    // installs it as a real `node_modules` dependency. See
    // `docs/architecture/browser-capture.md`.
    optimizeDeps: {
        exclude: ['playwright', 'playwright-core'],
    },
    plugins: [
        apiSecFetchDestStrip(),
        reflectMetadataForTsyringe(),
        devtools(),
        nitro({
            rollupConfig: {
                external: ['playwright', 'playwright-core'],
                // Nitro's server rollup does not always see root Vite plugins
                // for vendored chunks — register the polyfill transform here
                // too. See [architecture/authentication.md](docs/architecture/authentication.md#passkeys-webauthn).
                plugins: [reflectMetadataForTsyringe()],
            },
        }),
        tailwindcss(),
        tanstackStart(),
        viteReact(),
    ],
});

export default config;
