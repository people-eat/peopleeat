# syntax=docker/dockerfile:1

FROM node:24.20.0-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g "npm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
# Skip husky (`prepare`) and `npm dedupe` (`postinstall`) — neither is useful
# in the image, and dedupe after `npm ci` is a long no-op. Playwright's
# postinstall would also try to fetch browsers; we install Chromium only in
# the runtime stage. npm cache mount reuses tarballs when the lockfile
# changes instead of re-downloading the whole tree.
RUN --mount=type=cache,target=/root/.npm \
    npm pkg delete scripts.prepare scripts.postinstall \
    && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA

# Browser capture: Playwright + Chromium. These layers are placed
# before the application copy so they cache across application code
# changes — the Chromium download dominates image build time and rarely
# changes. See `docs/architecture/browser-capture.md`.
#
# Nitro inlines the rest of the app. The runtime `node_modules` only needs
# playwright (chromium-bidi loads via paths Vite cannot statically resolve)
# and `pg` (so `@opentelemetry/instrumentation-pg` can patch the real module;
# Nitro must keep `pg` / `pg-pool` external). Installing the full production
# tree with `npm ci --omit=dev` would extract hundreds of packages the
# container never imports.
#
# The Debian-based `node:24-slim` base is required — Chromium's prebuilt
# binaries are linked against glibc and will not run on Alpine.
#
# `PLAYWRIGHT_BROWSERS_PATH` pins the browser install to a fixed,
# user-independent location. The install steps below run as root (HOME
# would be /root), but the container runs as `node` (HOME=/home/node) —
# without a shared path, Chromium downloads into /root/.cache and the
# runtime process searching /home/node/.cache finds nothing. Setting the
# env once covers both install and runtime.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm install -g "npm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
# Pin playwright + pg to lockfile versions, drop the rest of the tree, and
# install. `npm ci` cannot be used after rewriting package.json (the
# lockfile would no longer match). `pg-pool` installs transitively with `pg`.
RUN --mount=type=cache,target=/root/.npm \
    node --input-type=commonjs -e "\
const { readFileSync, writeFileSync, unlinkSync } = require('node:fs');\
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));\
const playwright = lock.packages['node_modules/playwright']?.version;\
const pg = lock.packages['node_modules/pg']?.version;\
if (!playwright) throw new Error('lockfile missing playwright');\
if (!pg) throw new Error('lockfile missing pg');\
writeFileSync('package.json', JSON.stringify({\
  name: 'runtime',\
  private: true,\
  dependencies: { playwright, pg },\
}, null, 2));\
unlinkSync('package-lock.json');\
" \
    && npm install --omit=dev --no-audit --no-fund
RUN npx playwright install-deps chromium
# Install into a BuildKit cache mount first so a package.json change (which
# invalidates the npm-install layer above) does not re-download the
# multi-hundred-megabyte Chromium build. Then copy into /ms-playwright so
# the files actually land in the image — cache mounts are not persisted
# in the layer. chmod so the `node` user can read root-created files.
RUN --mount=type=cache,id=playwright-chromium,target=/opt/playwright-cache \
    PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-cache npx playwright install chromium \
    && mkdir -p /ms-playwright \
    && cp -a /opt/playwright-cache/. /ms-playwright/ \
    && chmod -R a+rX /ms-playwright

COPY --from=build --chown=node:node /app/.output ./.output

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
