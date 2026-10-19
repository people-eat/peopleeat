import { metrics } from '@opentelemetry/api';
import type { Counter, Histogram, Meter } from '@opentelemetry/api';

const METER_NAME = 'peopleeat';

type RedMeters = {
    duration: Histogram;
    errors: Counter;
};

let graphqlMeters: RedMeters | undefined;
let jobMeters: RedMeters | undefined;

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

export function graphqlOperationRecord(operationName: string, durationMs: number, errored: boolean): void {
    const attributes = { 'graphql.operation.name': operationName };
    const meters = graphqlMetersGet();
    meters.duration.record(durationMs, attributes);
    if (errored) {
        meters.errors.add(1, attributes);
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

/** In-process sliding window for Slack ops alerts (not a substitute for Grafana). */
type WindowSample = { atMs: number; durationMs: number; errored: boolean; name: string };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_SAMPLES = 5_000;

const graphqlWindow: WindowSample[] = [];
const jobWindow: WindowSample[] = [];

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

export function redWindowSnapshotGet(): { graphql: RedWindowSnapshot; jobs: RedWindowSnapshot; windowMinutes: number } {
    return {
        graphql: windowSnapshot(graphqlWindow),
        jobs: windowSnapshot(jobWindow),
        windowMinutes: WINDOW_MS / 60_000,
    };
}
