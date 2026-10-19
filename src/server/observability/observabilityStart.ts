import { LangfuseSpanProcessor } from '@langfuse/otel';
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk';
import { metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { registerTelemetry } from 'ai';

import type { EnvironmentVariables } from '../env/EnvironmentVariables';
import { environmentVariables } from '../env/environmentVariablesCreate';

let started = false;

function otlpHeadersParse(raw: string | undefined): Record<string, string> | undefined {
    if (!raw?.trim()) {
        return undefined;
    }
    const headers: Record<string, string> = {};
    for (const part of raw.split(',')) {
        const trimmed = part.trim();
        if (!trimmed) {
            continue;
        }
        const eq = trimmed.indexOf('=');
        if (eq <= 0) {
            continue;
        }
        headers[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return Object.keys(headers).length > 0 ? headers : undefined;
}

/**
 * Start OpenTelemetry (+ optional Langfuse AI SDK telemetry) once per process.
 * Safe to call repeatedly; no-ops when both transports are `off`.
 */
export function observabilityStart(environmentVariablesValue: EnvironmentVariables = environmentVariables): void {
    if (started) {
        return;
    }
    started = true;

    const langfuseEnabled = environmentVariablesValue.langfuseTransport === 'cloud';
    const otelTransport = environmentVariablesValue.otelTransport;
    const otlpEnabled = otelTransport === 'otlp';
    const consoleEnabled = otelTransport === 'console';

    if (!langfuseEnabled && !otlpEnabled && !consoleEnabled) {
        return;
    }

    const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'peopleeat',
        [ATTR_SERVICE_VERSION]: environmentVariablesValue.buildSha,
        'deployment.environment': environmentVariablesValue.observabilityEnvironment,
    });

    const spanProcessors = [];

    if (langfuseEnabled) {
        spanProcessors.push(
            new LangfuseSpanProcessor({
                publicKey: environmentVariablesValue.langfusePublicKey,
                secretKey: environmentVariablesValue.langfuseSecretKey,
                baseUrl: environmentVariablesValue.langfuseBaseUrl,
                environment: environmentVariablesValue.observabilityEnvironment,
                release: environmentVariablesValue.buildSha,
            }),
        );
    }

    if (otlpEnabled) {
        const headers = otlpHeadersParse(environmentVariablesValue.otelExporterOtlpHeaders);
        spanProcessors.push(
            new BatchSpanProcessor(
                new OTLPTraceExporter({
                    url: `${environmentVariablesValue.otelExporterOtlpEndpoint!.replace(/\/$/, '')}/v1/traces`,
                    headers,
                }),
            ),
        );

        const meterProvider = new MeterProvider({
            resource,
            readers: [
                new PeriodicExportingMetricReader({
                    exporter: new OTLPMetricExporter({
                        url: `${environmentVariablesValue.otelExporterOtlpEndpoint!.replace(/\/$/, '')}/v1/metrics`,
                        headers,
                    }),
                    exportIntervalMillis: 60_000,
                }),
            ],
        });
        metrics.setGlobalMeterProvider(meterProvider);
    }

    if (consoleEnabled) {
        spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }

    const sdk = new NodeSDK({
        resource,
        spanProcessors,
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

    sdk.start();

    if (langfuseEnabled || otlpEnabled) {
        registerTelemetry(new LangfuseVercelAiSdkIntegration());
    }
}
