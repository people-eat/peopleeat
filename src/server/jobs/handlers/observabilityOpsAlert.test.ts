import { describe, expect, it, vi } from 'vitest';

import { graphqlOperationWindowRecord, httpIngressWindowRecord, redWindowSnapshotGet } from '../../observability/redMetrics';
import { observabilityOpsAlertSlackMessageBuild } from '../../slack/observabilityOpsAlertSlackMessage';
import { commandSetup } from '../../test/commandTestUtils';
import { observabilityOpsAlertRun } from './observabilityOpsAlert';

describe('observabilityOpsAlertSlackMessageBuild', () => {
    it('lists the fired thresholds', () => {
        const { text, blocks } = observabilityOpsAlertSlackMessageBuild({
            graphql: { sampleCount: 100, errorCount: 10, errorRate: 0.1, p95DurationMs: 6000 },
            jobs: { sampleCount: 0, errorCount: 0, errorRate: 0, p95DurationMs: null },
            ingress: { sampleCount: 10, errorCount: 2, errorRate: 0.2, p95DurationMs: 800 },
            windowMinutes: 15,
            errorLogCount: 30,
            slowStatements: [{ meanExecTimeMs: 1500, calls: 20, query: 'SELECT 1' }],
            graphqlErrorRateThreshold: 0.05,
            graphqlP95MsThreshold: 5000,
            errorLogCountThreshold: 25,
            slowMeanMsThreshold: 1000,
        });
        expect(text).toContain('Observability alert');
        const body = JSON.stringify(blocks);
        expect(body).toContain('GraphQL error rate');
        expect(body).toContain('GraphQL p95');
        expect(body).toContain('Ingress error rate');
        expect(body).toContain('error log rows');
        expect(body).toContain('Slow SQL');
    });
});

describe('redWindowSnapshotGet', () => {
    it('records GraphQL and ingress samples into the sliding window', () => {
        graphqlOperationWindowRecord('TestOp', 120, false);
        graphqlOperationWindowRecord('TestOp', 130, true);
        httpIngressWindowRecord('stripe', 40, false);
        httpIngressWindowRecord('stripe', 50, true);
        const snapshot = redWindowSnapshotGet();
        expect(snapshot.graphql.sampleCount).toBeGreaterThanOrEqual(2);
        expect(snapshot.graphql.errorCount).toBeGreaterThanOrEqual(1);
        expect(snapshot.ingress.sampleCount).toBeGreaterThanOrEqual(2);
        expect(snapshot.ingress.errorCount).toBeGreaterThanOrEqual(1);
    });
});

describe('observabilityOpsAlertRun', () => {
    it('is silent when Slack ops channel is unset (console transport)', async () => {
        const { serverRuntime } = await commandSetup();
        const postMessage = vi.fn();
        serverRuntime.slack.postMessage = postMessage;
        serverRuntime.slack.channels.opsAlerts = undefined;

        await observabilityOpsAlertRun(serverRuntime);
        expect(postMessage).not.toHaveBeenCalled();
    });
});
