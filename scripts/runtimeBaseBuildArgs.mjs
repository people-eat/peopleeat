#!/usr/bin/env node
/**
 * Emit Docker build-args for Dockerfile.runtime-base from package-lock.json
 * (and npm from package.json#packageManager).
 *
 * Usage:
 *   node scripts/runtimeBaseBuildArgs.mjs           # KEY=value (default)
 *   node scripts/runtimeBaseBuildArgs.mjs env       # same
 *   node scripts/runtimeBaseBuildArgs.mjs docker    # --build-arg KEY=value lines
 *   node scripts/runtimeBaseBuildArgs.mjs gha       # lowercase keys for GITHUB_OUTPUT
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function ver(name) {
    const v = lock.packages[`node_modules/${name}`]?.version;
    if (!v) {
        throw new Error(`package-lock.json missing node_modules/${name}`);
    }
    return v;
}

const npmVersion = pkg.packageManager?.split('@')[1];
if (!npmVersion) {
    throw new Error('package.json#packageManager must look like npm@<version>');
}

const args = {
    NPM_VERSION: npmVersion,
    PLAYWRIGHT_VERSION: ver('playwright'),
    PG_VERSION: ver('pg'),
    OTEL_API_VERSION: ver('@opentelemetry/api'),
    OTEL_INSTRUMENTATION_VERSION: ver('@opentelemetry/instrumentation'),
    OTEL_INSTRUMENTATION_HTTP_VERSION: ver('@opentelemetry/instrumentation-http'),
    OTEL_INSTRUMENTATION_PG_VERSION: ver('@opentelemetry/instrumentation-pg'),
};

const format = process.argv[2] ?? 'env';

if (format === 'docker') {
    for (const [key, value] of Object.entries(args)) {
        console.log(`--build-arg ${key}=${value}`);
    }
} else if (format === 'gha') {
    for (const [key, value] of Object.entries(args)) {
        console.log(`${key}=${value}`);
    }
} else if (format === 'env') {
    for (const [key, value] of Object.entries(args)) {
        console.log(`${key}=${value}`);
    }
} else {
    throw new Error(`Unknown format "${format}" (use env | docker | gha)`);
}
