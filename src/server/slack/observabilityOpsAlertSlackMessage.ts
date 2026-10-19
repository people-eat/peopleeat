import type { KnownBlock } from '@slack/web-api';

import type { RedWindowSnapshot } from '../observability/redMetrics';
import { slackMessageBlocksBuild } from './slackBlocks';

export type ObservabilityOpsAlertInput = {
    graphql: RedWindowSnapshot;
    jobs: RedWindowSnapshot;
    ingress: RedWindowSnapshot;
    windowMinutes: number;
    errorLogCount: number;
    slowStatements: Array<{
        meanExecTimeMs: number;
        calls: number;
        query: string;
    }>;
    graphqlErrorRateThreshold: number;
    graphqlP95MsThreshold: number;
    errorLogCountThreshold: number;
    slowMeanMsThreshold: number;
};

export function observabilityOpsAlertSlackMessageBuild(input: ObservabilityOpsAlertInput): {
    text: string;
    blocks: KnownBlock[];
} {
    const lines: string[] = [];

    if (input.graphql.sampleCount > 0 && input.graphql.errorRate >= input.graphqlErrorRateThreshold) {
        lines.push(
            `GraphQL error rate ${(input.graphql.errorRate * 100).toFixed(1)}% over ${input.graphql.sampleCount} ops (threshold ${(input.graphqlErrorRateThreshold * 100).toFixed(0)}%)`,
        );
    }
    if (input.graphql.p95DurationMs != null && input.graphql.p95DurationMs >= input.graphqlP95MsThreshold) {
        lines.push(`GraphQL p95 ${Math.round(input.graphql.p95DurationMs)}ms (threshold ${input.graphqlP95MsThreshold}ms)`);
    }
    if (input.jobs.sampleCount > 0 && input.jobs.errorRate >= input.graphqlErrorRateThreshold) {
        lines.push(
            `Job error rate ${(input.jobs.errorRate * 100).toFixed(1)}% over ${input.jobs.sampleCount} runs (threshold ${(input.graphqlErrorRateThreshold * 100).toFixed(0)}%)`,
        );
    }
    if (input.ingress.sampleCount > 0 && input.ingress.errorRate >= input.graphqlErrorRateThreshold) {
        lines.push(
            `Ingress error rate ${(input.ingress.errorRate * 100).toFixed(1)}% over ${input.ingress.sampleCount} requests (threshold ${(input.graphqlErrorRateThreshold * 100).toFixed(0)}%)`,
        );
    }
    if (input.errorLogCount >= input.errorLogCountThreshold) {
        lines.push(
            `${input.errorLogCount} error log rows in the last ${input.windowMinutes} minutes (threshold ${input.errorLogCountThreshold})`,
        );
    }
    for (const statement of input.slowStatements.slice(0, 3)) {
        lines.push(`Slow SQL mean ${Math.round(statement.meanExecTimeMs)}ms × ${statement.calls}: ${statement.query.slice(0, 120)}`);
    }

    return slackMessageBlocksBuild({
        header: 'Observability alert',
        body: lines.join('\n'),
    });
}
