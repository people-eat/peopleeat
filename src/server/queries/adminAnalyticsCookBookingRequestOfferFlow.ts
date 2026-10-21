import { sql } from 'drizzle-orm';

import { cookBookingRequestOfferFunnelArea, cookBookingRequestOfferFunnelSteps } from '../../shared/cookBookingRequestOfferFunnel';
import type { CookBookingRequestOfferFunnelStep } from '../../shared/cookBookingRequestOfferFunnel';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsCookBookingRequestOfferFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

const FUNNEL_LABELS: Record<CookBookingRequestOfferFunnelStep, { de: string; en: string }> = {
    notified: { de: 'Benachrichtigt', en: 'Notified' },
    opened: { de: 'Geöffnet', en: 'Opened' },
    declined: { de: 'Abgelehnt', en: 'Declined' },
    offer_create: { de: 'Angebot starten', en: 'Start offer' },
    menus: { de: 'Menüs', en: 'Menus' },
    price: { de: 'Preis', en: 'Price' },
    message: { de: 'Nachricht', en: 'Message' },
    created: { de: 'Angebot erstellt', en: 'Offer created' },
};

type CohortRow = {
    cook_id: string;
    booking_request_id: string;
    first_opened_at: Date | string | null;
    declined_at: Date | string | null;
    offer_id: string | null;
};

type InteractionRow = {
    cook_id: string;
    booking_request_id: string;
    step: string;
    interaction_type: string;
};

type PathKey = string;

function pathKey(cookId: string, bookingRequestId: string): PathKey {
    return `${cookId}\0${bookingRequestId}`;
}

/**
 * Builds a Sankey of cook × booking-request offer creation for cooks notified
 * in the range. Early/terminal steps come from BookingRequestCooks + Offers;
 * create-UI mid-steps from session interactions keyed by bookingRequestId.
 */
export async function adminAnalyticsCookBookingRequestOfferFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsCookBookingRequestOfferFlow> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(range);

        const cohortResult = await serverRuntime.db.execute<CohortRow>(sql`
            SELECT
                brc."cookId" AS cook_id,
                brc."bookingRequestId" AS booking_request_id,
                brc."firstOpenedAt" AS first_opened_at,
                brc."declinedAt" AS declined_at,
                o."bookingRequestOfferId" AS offer_id
            FROM "BookingRequestCooks" brc
            LEFT JOIN "Admins" a ON a."adminId" = brc."cookId"
            LEFT JOIN "BookingRequestOffers" o
                ON o."cookId" = brc."cookId"
               AND o."bookingRequestId" = brc."bookingRequestId"
            WHERE brc."notifiedAt" IS NOT NULL
              AND brc."notifiedAt" >= ${startDateTime}
              AND brc."notifiedAt" < ${endDateTime}
              AND a."adminId" IS NULL
        `);

        const cohortRows = Array.isArray(cohortResult) ? cohortResult : cohortResult.rows;

        const interactionResult = await serverRuntime.db.execute<InteractionRow>(sql`
            SELECT
                s."userId" AS cook_id,
                e.payload->>'bookingRequestId' AS booking_request_id,
                e.payload->'interaction'->>'step' AS step,
                e.payload->'interaction'->>'type' AS interaction_type
            FROM "SessionEvents" e
            INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
            INNER JOIN "BookingRequestCooks" brc
                ON brc."cookId" = s."userId"
               AND brc."bookingRequestId" = e.payload->>'bookingRequestId'
            LEFT JOIN "Admins" a ON a."adminId" = s."userId"
            WHERE s."isBot" = false
              AND s."userId" IS NOT NULL
              AND a."adminId" IS NULL
              AND brc."notifiedAt" IS NOT NULL
              AND brc."notifiedAt" >= ${startDateTime}
              AND brc."notifiedAt" < ${endDateTime}
              AND e.type = 'WEB_PAGE_INTERACTION'
              AND e.payload->>'area' = ${cookBookingRequestOfferFunnelArea}
              AND e.payload->'interaction'->>'type' IN ('step_entered', 'step_completed')
              AND e.payload->'interaction'->>'step' IN ('offer_create', 'menus', 'price', 'message')
              AND e.payload->>'bookingRequestId' IS NOT NULL
        `);

        const interactionRows = Array.isArray(interactionResult) ? interactionResult : interactionResult.rows;

        const enteredByStep = new Map<string, Set<PathKey>>();
        const completedByStep = new Map<string, Set<PathKey>>();
        const clientReached = new Map<PathKey, Set<string>>();

        function mark(map: Map<string, Set<PathKey>>, step: string, key: PathKey) {
            const set = map.get(step) ?? new Set<PathKey>();
            set.add(key);
            map.set(step, set);
        }

        for (const row of interactionRows) {
            if (row.cook_id == null || row.booking_request_id == null) continue;
            const key = pathKey(row.cook_id, row.booking_request_id);
            const reached = clientReached.get(key) ?? new Set<string>();
            reached.add(row.step);
            clientReached.set(key, reached);
            if (row.interaction_type === 'step_entered') {
                mark(enteredByStep, row.step, key);
            } else if (row.interaction_type === 'step_completed') {
                mark(completedByStep, row.step, key);
            }
        }

        const sequences: string[][] = [];
        let openedCount = 0;
        let declinedCount = 0;
        let offersCreatedCount = 0;

        for (const row of cohortRows) {
            const key = pathKey(row.cook_id, row.booking_request_id);
            const hasOffer = row.offer_id != null;
            const declined = row.declined_at != null;
            const reached = clientReached.get(key) ?? new Set<string>();
            const hasCreateUi =
                reached.has('offer_create') || reached.has('menus') || reached.has('price') || reached.has('message') || hasOffer;
            // Legacy rows often lack firstOpenedAt; treat any later activity as opened.
            const opened = row.first_opened_at != null || declined || hasCreateUi;

            mark(completedByStep, 'notified', key);
            if (opened) {
                openedCount += 1;
                mark(completedByStep, 'opened', key);
            }
            if (hasOffer) {
                offersCreatedCount += 1;
                mark(completedByStep, 'created', key);
            }

            const sequence: string[] = ['notified'];
            if (opened) sequence.push('opened');

            if (declined && !hasCreateUi) {
                declinedCount += 1;
                mark(completedByStep, 'declined', key);
                sequence.push('declined');
                sequences.push(sequence);
                continue;
            }

            if (hasCreateUi) {
                sequence.push('offer_create');
                if (
                    !completedByStep.get('offer_create')?.has(key) &&
                    (reached.has('menus') || reached.has('price') || reached.has('message') || hasOffer)
                ) {
                    mark(completedByStep, 'offer_create', key);
                }
            }
            if (reached.has('menus') || reached.has('price') || reached.has('message') || hasOffer) {
                sequence.push('menus');
                if (!completedByStep.get('menus')?.has(key) && (reached.has('price') || reached.has('message') || hasOffer)) {
                    mark(completedByStep, 'menus', key);
                }
            }
            if (reached.has('price') || reached.has('message') || hasOffer) {
                sequence.push('price');
                if (!completedByStep.get('price')?.has(key) && (reached.has('message') || hasOffer)) {
                    mark(completedByStep, 'price', key);
                }
            }
            if (reached.has('message') || hasOffer) {
                sequence.push('message');
                if (!completedByStep.get('message')?.has(key) && hasOffer) {
                    mark(completedByStep, 'message', key);
                }
            }
            if (hasOffer) {
                sequence.push('created');
            }
            sequences.push(sequence);
        }

        const edgeCounts = new Map<string, number>();
        const nodeIds = new Set<string>();
        const stepOrder = new Map(cookBookingRequestOfferFunnelSteps.map((step, index) => [step, index]));

        for (const steps of sequences) {
            for (let index = 0; index < steps.length - 1; index += 1) {
                const source = steps[index]!;
                const target = steps[index + 1]!;
                const sourceOrder = stepOrder.get(source as CookBookingRequestOfferFunnelStep);
                const targetOrder = stepOrder.get(target as CookBookingRequestOfferFunnelStep);
                if (sourceOrder == null || targetOrder == null || sourceOrder >= targetOrder) continue;
                nodeIds.add(source);
                nodeIds.add(target);
                const edgeKey = `${source}\0${target}`;
                edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) ?? 0) + 1);
            }
            if (steps.length === 1) {
                nodeIds.add(steps[0]!);
            }
        }

        const nodes = cookBookingRequestOfferFunnelSteps
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

        const steps = cookBookingRequestOfferFunnelSteps.map((step) => ({
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
            notifiedCount: cohortRows.length,
            openedCount,
            declinedCount,
            offersCreatedCount,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
