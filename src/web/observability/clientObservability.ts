import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

import type { GqlCClientObservabilityReportInput, GqlCClientWebVitalName } from '../graphql/generated';
import { pathWithoutLocale } from '../utils/locale';

const REPORT_OPERATION = 'ClientObservabilityReport';

const REPORT_MUTATION = `
mutation ClientObservabilityReport($input: ClientObservabilityReportInput!) {
  clientObservabilityReport(input: $input) {
    success
    referenceId
  }
}
`;

const reportedVitals = new Set<string>();

function currentPath(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return pathWithoutLocale(window.location.pathname);
}

function report(input: GqlCClientObservabilityReportInput): void {
    if (typeof window === 'undefined') return;
    try {
        void fetch('/api/graphql', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: REPORT_MUTATION,
                operationName: REPORT_OPERATION,
                variables: { input },
            }),
        });
    } catch {
        // Never break the UI for telemetry.
    }
}

function onVital(metric: Metric): void {
    if (reportedVitals.has(metric.name)) return;
    reportedVitals.add(metric.name);
    const vitalName = metric.name as GqlCClientWebVitalName;
    report({
        kind: 'WEB_VITAL',
        vitalName,
        value: metric.value,
        path: currentPath(),
    });
}

/** Start Web Vitals collectors (once per page load). */
export function clientObservabilityWebVitalsStart(): void {
    if (typeof window === 'undefined') return;
    onLCP(onVital);
    onINP(onVital);
    onCLS(onVital);
    onFCP(onVital);
    onTTFB(onVital);
}

export function clientObservabilityGraphqlErrorReport(operationName: string | undefined, message: string): void {
    if (operationName === REPORT_OPERATION) return;
    report({
        kind: 'GRAPHQL_ERROR',
        operationName: operationName?.trim() || 'anonymous',
        message: message.slice(0, 200),
        path: currentPath(),
    });
}

export function clientObservabilityRouteErrorReport(message: string, routeId?: string): void {
    report({
        kind: 'ROUTE_ERROR',
        message: message.slice(0, 200),
        path: currentPath(),
        routeId,
    });
}

export function clientObservabilityIsReportOperation(operationName: string | undefined): boolean {
    return operationName === REPORT_OPERATION;
}
