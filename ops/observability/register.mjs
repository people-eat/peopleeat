/**
 * Node `--import` preload: register Pg + HTTP instrumentations BEFORE the app
 * (and `pg`) loads. Without this, `observabilityStart()` inside the Nitro bundle
 * runs too late and Tempo GraphQL traces have no `pg.query:*` children.
 *
 * Production: `node --import ./ops/observability/register.mjs .output/server/index.mjs`
 * Dev: `NODE_OPTIONS=--import ./ops/observability/register.mjs` on `npm run dev`
 *
 * Exporters / Langfuse / meters still start from `observabilityStart()` in the app.
 *
 * @see docs/architecture/observability.md
 */

import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

const INSTRUMENTATIONS_FLAG = 'peopleeat.otel.instrumentationsRegistered';

const otelTransport = process.env.OTEL_TRANSPORT ?? 'off';
const langfuseTransport = process.env.LANGFUSE_TRANSPORT ?? 'off';

if (otelTransport === 'off' && langfuseTransport === 'off') {
    // Local/test default: do not patch modules when nothing will export spans.
} else if (globalThis[Symbol.for(INSTRUMENTATIONS_FLAG)]) {
    // Already registered (e.g. double --import).
} else {
    registerInstrumentations({
        instrumentations: [
            new HttpInstrumentation({
                ignoreIncomingRequestHook: (request) => {
                    const url = request.url ?? '';
                    return url.includes('/api/health');
                },
            }),
            new PgInstrumentation({
                enhancedDatabaseReporting: true,
                addSqlCommenterCommentToQueries: false,
                ignoreConnectSpans: true,
            }),
        ],
    });
    globalThis[Symbol.for(INSTRUMENTATIONS_FLAG)] = true;
}
