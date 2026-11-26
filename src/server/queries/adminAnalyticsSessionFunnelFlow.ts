import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

export type AdminAnalyticsSessionFunnelConfig = {
    area: string;
    steps: readonly string[];
    labels: Record<string, string>;
    /** Lifecycle event types mapped onto funnel step ids. The last entry is the terminal. */
    lifecycleTypes: ReadonlyArray<{ type: string; step: string }>;
    /** When true, exclude sessions whose user is a cook (booking form / gift card). */
    excludeCooks: boolean;
};

type StepRow = {
    session_id: string;
    step: string;
    interaction_type: string;
    created_at: Date | string;
};

/**
 * Session-grain funnel (step_entered / step_completed + lifecycle terminal events)
 * for human non-admin sessions, optionally excluding cooks.
 */
export async function adminAnalyticsSessionFunnelFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    config: AdminAnalyticsSessionFunnelConfig,
): Promise<GqlSAdminAnalyticsSessionFunnelFlow> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(range);

        const lifecycleStepCaseFragments = config.lifecycleTypes.map((entry) => sql`WHEN e.type = ${entry.type} THEN ${entry.step}`);
        const lifecycleTypePredicates = config.lifecycleTypes.map((entry) => sql`e.type = ${entry.type}`);
        const lifecycleOr = lifecycleTypePredicates.length === 0 ? sql`false` : sql`(${sql.join(lifecycleTypePredicates, sql` OR `)})`;
        const lifecycleCase =
            lifecycleStepCaseFragments.length === 0
                ? sql`ELSE e.payload->'interaction'->>'step'`
                : sql`CASE ${sql.join(lifecycleStepCaseFragments, sql` `)} ELSE e.payload->'interaction'->>'step' END`;
        const lifecycleCompletedCase =
            lifecycleTypePredicates.length === 0
                ? sql`e.payload->'interaction'->>'type'`
                : sql`CASE WHEN ${lifecycleOr} THEN 'step_completed' ELSE e.payload->'interaction'->>'type' END`;

        const cookJoin = config.excludeCooks ? sql`LEFT JOIN "Cooks" c ON c."cookId" = s."userId"` : sql``;
        const cookFilter = config.excludeCooks ? sql`AND c."cookId" IS NULL` : sql``;

        const result = await serverRuntime.db.execute<StepRow>(sql`
            SELECT
                e."sessionId" AS session_id,
                ${lifecycleCase} AS step,
                ${lifecycleCompletedCase} AS interaction_type,
                e."createdAt" AS created_at
            FROM "SessionEvents" e
            INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
            LEFT JOIN "Admins" a ON a."adminId" = s."userId"
            ${cookJoin}
            WHERE s."isBot" = false
              AND a."adminId" IS NULL
              AND s."impersonationReturnSessionId" IS NULL
              ${cookFilter}
              AND e."createdAt" >= ${startDateTime}
              AND e."createdAt" < ${endDateTime}
              AND (
                (
                    e.type = 'WEB_PAGE_INTERACTION'
                    AND e.payload->>'area' = ${config.area}
                    AND e.payload->'interaction'->>'type' IN ('step_entered', 'step_completed')
                    AND e.payload->'interaction'->>'step' IS NOT NULL
                )
                OR ${lifecycleOr}
              )
            ORDER BY
                e."sessionId",
                e."createdAt" ASC,
                CASE WHEN ${lifecycleOr} THEN 1 ELSE 0 END ASC
        `);

        const rows = Array.isArray(result) ? result : result.rows;
        const allowed = new Set<string>(config.steps);
        const completedStepsBySession = new Map<string, Set<string>>();
        const enteredByStep = new Map<string, Set<string>>();
        const completedByStep = new Map<string, Set<string>>();
        const sessionsWithCompletion = new Set<string>();
        const lifecycleSteps = new Set(config.lifecycleTypes.map((entry) => entry.step));
        const terminalStep = config.lifecycleTypes.at(-1)?.step;

        for (const row of rows) {
            if (!allowed.has(row.step)) continue;

            if (row.interaction_type === 'step_entered') {
                const sessions = enteredByStep.get(row.step) ?? new Set<string>();
                sessions.add(row.session_id);
                enteredByStep.set(row.step, sessions);
                continue;
            }

            if (row.interaction_type !== 'step_completed') continue;

            sessionsWithCompletion.add(row.session_id);

            const completedSessions = completedByStep.get(row.step) ?? new Set<string>();
            completedSessions.add(row.session_id);
            completedByStep.set(row.step, completedSessions);

            const existing = completedStepsBySession.get(row.session_id) ?? new Set<string>();
            existing.add(row.step);
            completedStepsBySession.set(row.session_id, existing);
        }

        const edgeCounts = new Map<string, number>();
        const nodeIds = new Set<string>();

        for (const completed of completedStepsBySession.values()) {
            const ordered = config.steps.filter((step) => completed.has(step));
            for (let index = 0; index < ordered.length - 1; index += 1) {
                const source = ordered[index]!;
                const target = ordered[index + 1]!;
                nodeIds.add(source);
                nodeIds.add(target);
                const key = `${source}\0${target}`;
                edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
            }
            if (ordered.length === 1) {
                nodeIds.add(ordered[0]!);
            }
        }

        const nodes = config.steps
            .filter((step) => nodeIds.has(step))
            .map((step) => ({
                id: step,
                label: config.labels[step] ?? step,
            }));

        const links = [...edgeCounts.entries()].map(([key, value]) => {
            const [source, target] = key.split('\0');
            return { source: source!, target: target!, value };
        });

        const steps = config.steps.map((step) => {
            const completedSessions = completedByStep.get(step) ?? new Set<string>();
            const enteredSessions = enteredByStep.get(step) ?? new Set<string>();
            const reachedSessions = lifecycleSteps.has(step) ? enteredSessions : new Set([...enteredSessions, ...completedSessions]);
            return {
                id: step,
                label: config.labels[step] ?? step,
                enteredCount: reachedSessions.size,
                completedCount: completedSessions.size,
            };
        });

        return {
            nodes,
            links,
            steps,
            sessionsWithCompletion: sessionsWithCompletion.size,
            terminalCount: terminalStep == null ? 0 : (completedByStep.get(terminalStep)?.size ?? 0),
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
