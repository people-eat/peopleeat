import { metrics } from '@opentelemetry/api';
import type { Counter, Histogram, Meter } from '@opentelemetry/api';

const METER_NAME = 'peopleeat';

let webVitalDuration: Histogram | undefined;
let webVitalScore: Histogram | undefined;
let graphqlErrors: Counter | undefined;
let routeErrors: Counter | undefined;

function meterGet(): Meter {
    return metrics.getMeter(METER_NAME);
}

export type ClientWebVitalName = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';

export function clientWebVitalRecord(name: ClientWebVitalName, value: number): void {
    const meter = meterGet();
    if (name === 'CLS') {
        if (!webVitalScore) {
            webVitalScore = meter.createHistogram('client.web_vital.score', {
                description: 'Browser Web Vital score (CLS)',
            });
        }
        webVitalScore.record(value, { 'vital.name': name });
        return;
    }
    if (!webVitalDuration) {
        webVitalDuration = meter.createHistogram('client.web_vital.duration', {
            description: 'Browser Web Vital timing',
            unit: 'ms',
        });
    }
    webVitalDuration.record(value, { 'vital.name': name });
}

export function clientGraphqlErrorRecord(operationName: string): void {
    if (!graphqlErrors) {
        graphqlErrors = meterGet().createCounter('client.graphql.errors', {
            description: 'Browser-reported GraphQL operation failures',
        });
    }
    graphqlErrors.add(1, { 'graphql.operation.name': operationName });
}

export function clientRouteErrorRecord(): void {
    if (!routeErrors) {
        routeErrors = meterGet().createCounter('client.route.errors', {
            description: 'Browser-reported route / error-boundary failures',
        });
    }
    routeErrors.add(1);
}
