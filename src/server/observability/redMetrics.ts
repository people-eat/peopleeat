import { metrics } from '@opentelemetry/api';
import type { Counter, Histogram, Meter } from '@opentelemetry/api';

import type { GraphqlErrorClass, GraphqlOperationType } from './graphqlOperationMeta';

const METER_NAME = 'peopleeat';

type RedMeters = {
    duration: Histogram;
    errors: Counter;
};

let graphqlMeters: RedMeters | undefined;
let jobMeters: RedMeters | undefined;
let ingressMeters: RedMeters | undefined;
let subscriptionDuration: Histogram | undefined;
let subscriptionEvents: Counter | undefined;
let subscriptionErrors: Counter | undefined;

function meterGet(): Meter {
    return metrics.getMeter(METER_NAME);
}

function graphqlMetersGet(): RedMeters {
    if (!graphqlMeters) {
        const meter = meterGet();
        graphqlMeters = {
            duration: meter.createHistogram('graphql.operation.duration', {
                description: 'GraphQL operation duration',
                unit: 'ms',
            }),
            errors: meter.createCounter('graphql.operation.errors', {
                description: 'GraphQL operations that returned errors or threw',
            }),
        };
    }
    return graphqlMeters;
}

function jobMetersGet(): RedMeters {
    if (!jobMeters) {
        const meter = meterGet();
        jobMeters = {
            duration: meter.createHistogram('job.handler.duration', {
                description: 'Background job handler duration',
                unit: 'ms',
            }),
            errors: meter.createCounter('job.handler.errors', {
                description: 'Background job handlers that threw',
            }),
        };
    }
    return jobMeters;
}

function ingressMetersGet(): RedMeters {
    if (!ingressMeters) {
        const meter = meterGet();
        ingressMeters = {
            duration: meter.createHistogram('http.ingress.duration', {
                description: 'HTTP ingress handler duration (webhooks, file upload)',
                unit: 'ms',
            }),
            errors: meter.createCounter('http.ingress.errors', {
                description: 'HTTP ingress handlers that returned 5xx or threw',
            }),
        };
    }
    return ingressMeters;
}

function subscriptionMetersGet(): { duration: Histogram; events: Counter; errors: Counter } {
    if (!subscriptionDuration || !subscriptionEvents || !subscriptionErrors) {
        const meter = meterGet();
        subscriptionDuration = meter.createHistogram('graphql.subscription.duration', {
            description: 'GraphQL SSE subscription connection lifetime',
            unit: 'ms',
        });
        subscriptionEvents = meter.createCounter('graphql.subscription.events', {
            description: 'GraphQL SSE events emitted',
        });
        subscriptionErrors = meter.createCounter('graphql.subscription.errors', {
            description: 'GraphQL SSE subscription connections that errored',
        });
    }
    return { duration: subscriptionDuration, events: subscriptionEvents, errors: subscriptionErrors };
}

export type GraphqlOperationRecordInput = {
    operationName: string;
    operationType: GraphqlOperationType;
    durationMs: number;
    errored: boolean;
    errorClass?: GraphqlErrorClass;
};

export function graphqlOperationRecord(input: GraphqlOperationRecordInput): void {
    const attributes = {
        'graphql.operation.name': input.operationName,
        'graphql.operation.type': input.operationType,
    };
    const meters = graphqlMetersGet();
    meters.duration.record(input.durationMs, attributes);
    if (input.errored) {
        meters.errors.add(1, {
            ...attributes,
            'graphql.error.class': input.errorClass ?? 'graphql_error',
        });
    }
}

export function jobHandlerRecord(jobName: string, durationMs: number, errored: boolean): void {
    const attributes = { 'job.name': jobName };
    const meters = jobMetersGet();
    meters.duration.record(durationMs, attributes);
    if (errored) {
        meters.errors.add(1, attributes);
    }
}

export type IngressProvider = 'stripe' | 'whatsapp' | 'resend' | 'slack' | 'file_upload';

export function httpIngressRecord(provider: IngressProvider, durationMs: number, statusCode: number, errored: boolean): void {
    const attributes = { 'ingress.provider': provider };
    const meters = ingressMetersGet();
    meters.duration.record(durationMs, attributes);
    if (errored || statusCode >= 500) {
        meters.errors.add(1, attributes);
    }
}

export function graphqlSubscriptionConnectionRecord(input: {
    operationName: string;
    durationMs: number;
    eventCount: number;
    errored: boolean;
}): void {
    const attributes = {
        'graphql.operation.name': input.operationName,
        'graphql.operation.type': 'subscription' as const,
    };
    const meters = subscriptionMetersGet();
    meters.duration.record(input.durationMs, attributes);
    if (input.eventCount > 0) {
        meters.events.add(input.eventCount, { 'graphql.operation.name': input.operationName });
    }
    if (input.errored) {
        meters.errors.add(1, attributes);
    }
}

/** In-process sliding window for Slack ops alerts (not a substitute for Grafana). */
type WindowSample = { atMs: number; durationMs: number; errored: boolean; name: string };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_SAMPLES = 5_000;

const graphqlWindow: WindowSample[] = [];
const jobWindow: WindowSample[] = [];
const ingressWindow: WindowSample[] = [];

function windowPush(window: WindowSample[], sample: WindowSample): void {
    window.push(sample);
    const cutoff = Date.now() - WINDOW_MS;
    while (window.length > 0 && (window[0]!.atMs < cutoff || window.length > MAX_SAMPLES)) {
        window.shift();
    }
}

export function graphqlOperationWindowRecord(operationName: string, durationMs: number, errored: boolean): void {
    windowPush(graphqlWindow, { atMs: Date.now(), durationMs, errored, name: operationName });
}

export function jobHandlerWindowRecord(jobName: string, durationMs: number, errored: boolean): void {
    windowPush(jobWindow, { atMs: Date.now(), durationMs, errored, name: jobName });
}

export function httpIngressWindowRecord(provider: IngressProvider, durationMs: number, errored: boolean): void {
    windowPush(ingressWindow, { atMs: Date.now(), durationMs, errored, name: provider });
}

export type RedWindowSnapshot = {
    sampleCount: number;
    errorCount: number;
    errorRate: number;
    p95DurationMs: number | null;
};

function windowSnapshot(window: WindowSample[]): RedWindowSnapshot {
    const cutoff = Date.now() - WINDOW_MS;
    const samples = window.filter((sample) => sample.atMs >= cutoff);
    const errorCount = samples.filter((sample) => sample.errored).length;
    if (samples.length === 0) {
        return { sampleCount: 0, errorCount: 0, errorRate: 0, p95DurationMs: null };
    }
    const durations = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
    const p95Index = Math.min(durations.length - 1, Math.floor(durations.length * 0.95));
    return {
        sampleCount: samples.length,
        errorCount,
        errorRate: errorCount / samples.length,
        p95DurationMs: durations[p95Index] ?? null,
    };
}

export function redWindowSnapshotGet(): {
    graphql: RedWindowSnapshot;
    jobs: RedWindowSnapshot;
    ingress: RedWindowSnapshot;
    windowMinutes: number;
} {
    return {
        graphql: windowSnapshot(graphqlWindow),
        jobs: windowSnapshot(jobWindow),
        ingress: windowSnapshot(ingressWindow),
        windowMinutes: WINDOW_MS / 60_000,
    };
}
