import { and, eq, gte, sql } from 'drizzle-orm';

import { logs } from '../../db/schema';
import type { ServerRuntime } from '../../domain/ServerRuntime';
import { redWindowSnapshotGet } from '../../observability/redMetrics';
import { databaseSlowStatementsFindMany, databaseSlowStatementsUnavailable } from '../../queries/databaseSlowStatementsFindMany';
import { observabilityOpsAlertSlackMessageBuild } from '../../slack/observabilityOpsAlertSlackMessage';
import type { RecurringJobDefinition } from '../types';

const WINDOW_MINUTES = 15;
const GRAPHQL_ERROR_RATE_THRESHOLD = 0.05;
const GRAPHQL_P95_MS_THRESHOLD = 5_000;
const ERROR_LOG_COUNT_THRESHOLD = 25;
const SLOW_MEAN_MS_THRESHOLD = 1_000;
const SLOW_MIN_CALLS = 5;

/**
 * Hourly observability threshold check → ops-alerts Slack channel.
 * Uses in-process RED windows, recent Postgres error logs, and
 * `pg_stat_statements`. Silent when healthy, Slack is console, or channel unset.
 */
export async function observabilityOpsAlertRun(serverRuntime: ServerRuntime): Promise<void> {
    const channelId = serverRuntime.slack.channels.opsAlerts;
    if (!channelId) {
        return;
    }

    const windows = redWindowSnapshotGet();
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);

    const [errorLogRow] = await serverRuntime.db
        .select({ count: sql<number>`count(*)::int` })
        .from(logs)
        .where(and(eq(logs.level, 'error'), gte(logs.createdAt, since)));
    const errorLogCount = Number(errorLogRow?.count ?? 0);

    let slowStatements: Array<{ meanExecTimeMs: number; calls: number; query: string }> = [];
    try {
        slowStatements = (await databaseSlowStatementsFindMany(serverRuntime.db, 20))
            .filter((row) => row.meanExecTimeMs >= SLOW_MEAN_MS_THRESHOLD && row.calls >= SLOW_MIN_CALLS)
            .slice(0, 5);
    } catch (error) {
        if (!databaseSlowStatementsUnavailable(error)) {
            serverRuntime.log.error(error);
        }
    }

    const graphqlHot =
        (windows.graphql.sampleCount >= 20 && windows.graphql.errorRate >= GRAPHQL_ERROR_RATE_THRESHOLD) ||
        (windows.graphql.p95DurationMs != null && windows.graphql.p95DurationMs >= GRAPHQL_P95_MS_THRESHOLD);
    const jobsHot = windows.jobs.sampleCount >= 10 && windows.jobs.errorRate >= GRAPHQL_ERROR_RATE_THRESHOLD;
    const logsHot = errorLogCount >= ERROR_LOG_COUNT_THRESHOLD;
    const sqlHot = slowStatements.length > 0;

    if (!graphqlHot && !jobsHot && !logsHot && !sqlHot) {
        return;
    }

    const { text, blocks } = observabilityOpsAlertSlackMessageBuild({
        graphql: windows.graphql,
        jobs: windows.jobs,
        windowMinutes: WINDOW_MINUTES,
        errorLogCount,
        slowStatements,
        graphqlErrorRateThreshold: GRAPHQL_ERROR_RATE_THRESHOLD,
        graphqlP95MsThreshold: GRAPHQL_P95_MS_THRESHOLD,
        errorLogCountThreshold: ERROR_LOG_COUNT_THRESHOLD,
        slowMeanMsThreshold: SLOW_MEAN_MS_THRESHOLD,
    });

    await serverRuntime.slack.postMessage({ channel: channelId, text, blocks });
}

export const observabilityOpsAlert: RecurringJobDefinition = {
    kind: 'recurring',
    name: 'observability-ops-alert',
    cron: '15 * * * *',
    handler: async ({ serverRuntime }) => {
        await observabilityOpsAlertRun(serverRuntime);
    },
    options: {
        retryLimit: 1,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
