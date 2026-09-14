import { sql } from 'drizzle-orm';

import { bookingRequestFormFunnelArea, bookingRequestFormFunnelSteps } from '../../shared/bookingRequestFormFunnel';
import type { BookingRequestFormFunnelStep } from '../../shared/bookingRequestFormFunnel';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsBookingRequestFormFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

const FUNNEL_LABELS: Record<BookingRequestFormFunnelStep, { de: string; en: string }> = {
    occasion: { de: 'Anlass', en: 'Occasion' },
    participants: { de: 'Gäste', en: 'Guests' },
    location: { de: 'Ort', en: 'Location' },
    dateTime: { de: 'Datum & Zeit', en: 'Date & time' },
    priceClass: { de: 'Preisklasse', en: 'Price class' },
    preferences: { de: 'Vorlieben', en: 'Preferences' },
    restrictions: { de: 'Einschränkungen', en: 'Restrictions' },
    message: { de: 'Nachricht', en: 'Message' },
    auth: { de: 'Anmeldung', en: 'Sign-in' },
    created: { de: 'Anfrage erstellt', en: 'Request created' },
};

type StepRow = {
    session_id: string;
    step: string;
    interaction_type: string;
    created_at: Date | string;
};

/**
 * Builds a Sankey of booking-form step_completed events plus BOOKING_REQUEST_CREATED,
 * plus per-step entered/completed session counts, for human sessions whose user is
 * not an admin or cook.
 */
export async function adminAnalyticsBookingRequestFormFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsBookingRequestFormFlow> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(range);

        const result = await serverRuntime.db.execute<StepRow>(sql`
            SELECT
                e."sessionId" AS session_id,
                CASE
                    WHEN e.type = 'BOOKING_REQUEST_CREATED' THEN 'created'
                    ELSE e.payload->'interaction'->>'step'
                END AS step,
                CASE
                    WHEN e.type = 'BOOKING_REQUEST_CREATED' THEN 'step_completed'
                    ELSE e.payload->'interaction'->>'type'
                END AS interaction_type,
                e."createdAt" AS created_at
            FROM "SessionEvents" e
            INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
            LEFT JOIN "Admins" a ON a."adminId" = s."userId"
            LEFT JOIN "Cooks" c ON c."cookId" = s."userId"
            WHERE s."isBot" = false
              AND a."adminId" IS NULL
              AND c."cookId" IS NULL
              AND e."createdAt" >= ${startDateTime}
              AND e."createdAt" < ${endDateTime}
              AND (
                (
                    e.type = 'WEB_PAGE_INTERACTION'
                    AND e.payload->>'area' = ${bookingRequestFormFunnelArea}
                    AND e.payload->'interaction'->>'type' IN ('step_entered', 'step_completed')
                    AND e.payload->'interaction'->>'step' IS NOT NULL
                )
                OR e.type = 'BOOKING_REQUEST_CREATED'
              )
            ORDER BY
                e."sessionId",
                e."createdAt" ASC,
                CASE WHEN e.type = 'BOOKING_REQUEST_CREATED' THEN 1 ELSE 0 END ASC
        `);

        const rows = Array.isArray(result) ? result : result.rows;
        const allowed = new Set<string>(bookingRequestFormFunnelSteps);
        const perSessionCompleted = new Map<string, string[]>();
        const enteredByStep = new Map<string, Set<string>>();
        const completedByStep = new Map<string, Set<string>>();
        const sessionsWithCompletion = new Set<string>();
        const bookingRequestsCreated = new Set<string>();

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
            if (row.step === 'created') {
                bookingRequestsCreated.add(row.session_id);
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
        // Recharts Sankey needs a DAG with at least one root. Back-steps (form edits) create
        // cycles where every node has an inbound edge, leaving node.x unset (NaN paths).
        const stepOrder = new Map(bookingRequestFormFunnelSteps.map((step, index) => [step, index]));

        for (const steps of perSessionCompleted.values()) {
            for (let index = 0; index < steps.length - 1; index += 1) {
                const source = steps[index]!;
                const target = steps[index + 1]!;
                const sourceOrder = stepOrder.get(source as BookingRequestFormFunnelStep);
                const targetOrder = stepOrder.get(target as BookingRequestFormFunnelStep);
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

        const nodes = bookingRequestFormFunnelSteps
            .filter((step) => nodeIds.has(step))
            .map((step) => ({
                id: step,
                labelDe: FUNNEL_LABELS[step].de,
                labelEn: FUNNEL_LABELS[step].en,
            }));

        const links = [...edgeCounts.entries()].map(([key, value]) => {
            const [source, target] = key.split('\0');
            return { source: source!, target: target!, value };
        });

        const steps = bookingRequestFormFunnelSteps.map((step) => ({
            id: step,
            labelDe: FUNNEL_LABELS[step].de,
            labelEn: FUNNEL_LABELS[step].en,
            enteredCount: enteredByStep.get(step)?.size ?? 0,
            completedCount: completedByStep.get(step)?.size ?? 0,
        }));

        return {
            nodes,
            links,
            steps,
            sessionsWithCompletion: sessionsWithCompletion.size,
            bookingRequestsCreated: bookingRequestsCreated.size,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
