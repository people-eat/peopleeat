import type { KnownBlock } from '@slack/web-api';

import type { RedWindowSnapshot } from '../observability/redMetrics';
import type { SlackField } from './slackBlocks';
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

function percent(ratio: number): string {
    return `${(ratio * 100).toFixed(1).replace('.', ',')}%`;
}

function durationLabel(ms: number): string {
    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
    }
    return `${Math.round(ms)} ms`;
}

export function observabilityOpsAlertSlackMessageBuild(input: ObservabilityOpsAlertInput): {
    text: string;
    blocks: KnownBlock[];
} {
    const fields: SlackField[] = [{ label: 'Zeitfenster', value: `letzte ${input.windowMinutes} Minuten` }];

    if (input.graphql.sampleCount > 0 && input.graphql.errorRate >= input.graphqlErrorRateThreshold) {
        fields.push({
            label: 'GraphQL-Fehlerquote',
            value: `${percent(input.graphql.errorRate)} (Schwelle ${percent(input.graphqlErrorRateThreshold)})`,
        });
    }
    if (input.graphql.p95DurationMs != null && input.graphql.p95DurationMs >= input.graphqlP95MsThreshold) {
        fields.push({
            label: 'GraphQL p95',
            value: `${durationLabel(input.graphql.p95DurationMs)} (Schwelle ${durationLabel(input.graphqlP95MsThreshold)})`,
        });
    }
    if (input.jobs.sampleCount > 0 && input.jobs.errorRate >= input.graphqlErrorRateThreshold) {
        fields.push({
            label: 'Job-Fehlerquote',
            value: `${percent(input.jobs.errorRate)} (Schwelle ${percent(input.graphqlErrorRateThreshold)})`,
        });
    }
    if (input.ingress.sampleCount > 0 && input.ingress.errorRate >= input.graphqlErrorRateThreshold) {
        fields.push({
            label: 'Ingress-Fehlerquote',
            value: `${percent(input.ingress.errorRate)} (Schwelle ${percent(input.graphqlErrorRateThreshold)})`,
        });
    }
    if (input.errorLogCount >= input.errorLogCountThreshold) {
        fields.push({
            label: 'Fehler-Logs',
            value: `${input.errorLogCount} (Schwelle ${input.errorLogCountThreshold})`,
        });
    }
    const slowTop = input.slowStatements[0];
    if (slowTop) {
        fields.push({
            label: 'Langsame Abfragen',
            value: `${input.slowStatements.length} · Mittelwert ${durationLabel(slowTop.meanExecTimeMs)} · ${slowTop.calls} Aufrufe`,
        });
    }

    return slackMessageBlocksBuild({
        header: 'Systemhinweis: erhöhte Fehler',
        fields,
        body: 'Technische Details stehen in den Server-Logs / APM, nicht in Slack.',
    });
}
