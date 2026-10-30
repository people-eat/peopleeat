# syntax=docker/dockerfile:1

FROM node:24.20.0-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g "npm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
# Skip husky (`prepare`) and `npm dedupe` (`postinstall`) — neither is useful
# in the image, and dedupe after `npm ci` is a long no-op. Playwright's
# postinstall would also try to fetch browsers; we install Chromium only in
# the runtime base image. npm cache mount reuses tarballs when the lockfile
# changes instead of re-downloading the whole tree.
RUN --mount=type=cache,target=/root/.npm \
    npm pkg delete scripts.prepare scripts.postinstall \
    && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Prebaked runtime (playwright + Chromium + pg + OTel). Built/pushed as
# `:runtime-base` in CD before this image — see Dockerfile.runtime-base and
# docs/infrastructure.md § Runtime base image.
ARG RUNTIME_BASE=ghcr.io/people-eat/peopleeat:runtime-base
FROM ${RUNTIME_BASE} AS runtime
WORKDIR /app

ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA

COPY --from=build --chown=node:node /app/.output ./.output
# OTel `--import` preload (must run before `.output/server/index.mjs` loads `pg`).
COPY --chown=node:node ops/observability/register.mjs ./ops/observability/register.mjs

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "--import", "./ops/observability/register.mjs", ".output/server/index.mjs"]
