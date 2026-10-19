import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

export type AdminAnalyticsSessionFunnelConfig = {
    area: string;
    steps: readonly string[];
    labels: Record<string, { de: string; en: string }>;
    /** Lifecycle event types mapped to a terminal funnel step id. */
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
                e."createdAt" ASC
        `);

        const rows = Array.isArray(result) ? result : result.rows;
        const allowed = new Set<string>(config.steps);
        const perSessionCompleted = new Map<string, string[]>();
        const enteredByStep = new Map<string, Set<string>>();
        const completedByStep = new Map<string, Set<string>>();
        const sessionsWithCompletion = new Set<string>();
        const terminalSessions = new Set<string>();
        const terminalSteps = new Set(config.lifecycleTypes.map((entry) => entry.step));

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
            if (terminalSteps.has(row.step)) {
                terminalSessions.add(row.session_id);
            }

            const completedSessions = completedByStep.get(row.step) ?? new Set<string>();
            completedSessions.add(row.session_id);
            completedByStep.set(row.step, completedSessions);

            const existing = perSessionCompleted.get(row.session_id) ?? [];
            if (existing.at(-1) === row.step) continue;
            existing.push(row.step);
            perSessionCompleted.set(row.session_id, existing);
        }

        const edgeCounts = new Map<string, number>();
        const nodeIds = new Set<string>();
        const stepOrder = new Map(config.steps.map((step, index) => [step, index]));

        for (const steps of perSessionCompleted.values()) {
            for (let index = 0; index < steps.length - 1; index += 1) {
                const source = steps[index]!;
                const target = steps[index + 1]!;
                const sourceOrder = stepOrder.get(source);
                const targetOrder = stepOrder.get(target);
                if (sourceOrder == null || targetOrder == null || sourceOrder >= targetOrder) continue;
                nodeIds.add(source);
                nodeIds.add(target);
                const key = `${source}\0${target}`;
                edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
            }
            if (steps.length === 1) {
                nodeIds.add(steps[0]!);
            }
        }

        const nodes = config.steps
            .filter((step) => nodeIds.has(step))
            .map((step) => ({
                id: step,
                labelDe: config.labels[step]?.de ?? step,
                labelEn: config.labels[step]?.en ?? step,
            }));

        const links = [...edgeCounts.entries()].map(([key, value]) => {
            const [source, target] = key.split('\0');
            return { source: source!, target: target!, value };
        });

        const steps = config.steps.map((step) => ({
            id: step,
            labelDe: config.labels[step]?.de ?? step,
            labelEn: config.labels[step]?.en ?? step,
            enteredCount: enteredByStep.get(step)?.size ?? 0,
            completedCount: completedByStep.get(step)?.size ?? 0,
        }));

        return {
            nodes,
            links,
            steps,
            sessionsWithCompletion: sessionsWithCompletion.size,
            terminalCount: terminalSessions.size,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
