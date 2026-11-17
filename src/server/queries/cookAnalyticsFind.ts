import { sql } from 'drizzle-orm';

import type { CookAnalyticsChannel, CookAnalyticsFunnelChannel } from '../../shared/cookAnalyticsChannel';
import { cookAnalyticsPeriodRange } from '../../shared/cookAnalyticsPeriod';
import { cookBookingRequestOfferFunnelArea } from '../../shared/cookBookingRequestOfferFunnel';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCook,
    GqlSCookAnalytics,
    GqlSCookAnalyticsArgs,
    GqlSCookAnalyticsFunnel,
    GqlSCookAnalyticsFunnelStage,
    GqlSCookAnalyticsOfferCreateStage,
    GqlSCookAnalyticsTrendPoint,
    GqlSSession,
} from '../graphql/generated';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

type AggregateRow = {
    requests_notified_count: string | number;
    requests_opened_count: string | number;
    requests_declined_count: string | number;
    median_notify_to_open_minutes: string | number | null;
    median_notify_to_offer_minutes: string | number | null;
    offers_created_count: string | number;
    offers_accepted_count: string | number;
    offers_paid_count: string | number;
    paid_payout_cents_cook_total: string | number;
    average_menu_price_cents: string | number | null;
    average_participants: string | number | null;
    public_profile_view_count: string | number;
    has_insights: boolean | string;
    direct_entry_count: string | number;
    direct_opened_count: string | number;
    direct_offer_sent_count: string | number;
    direct_both_accepted_count: string | number;
    direct_paid_count: string | number;
    pool_entry_count: string | number;
    pool_opened_count: string | number;
    pool_declined_count: string | number;
    pool_offer_sent_count: string | number;
    pool_both_accepted_count: string | number;
    pool_paid_count: string | number;
};

type OfferCreateInteractionRow = {
    booking_request_id: string;
    step: string;
    interaction_type: string;
};

type OfferCreateOfferRow = {
    booking_request_id: string;
};

type TrendRow = {
    bucket_start: Date | string;
    public_profile_view_count: string | number;
    offers_created_count: string | number;
    offers_paid_count: string | number;
};

function parseIntCount(value: string | number | null | undefined): number {
    if (value == null || value === '') return 0;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(parsed) ? 0 : Math.trunc(parsed);
}

function parseNullableFloat(value: string | number | null | undefined): number | null {
    if (value == null || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function parseNullableInt(value: string | number | null | undefined): number | null {
    const parsed = parseNullableFloat(value);
    return parsed == null ? null : Math.round(parsed);
}

function rate(numerator: number, denominator: number): number | null {
    if (denominator <= 0) return null;
    return numerator / denominator;
}

function rowsFromExecute<T>(result: T[] | { rows: T[] }): T[] {
    return Array.isArray(result) ? result : result.rows;
}

function isTruthyFlag(value: boolean | string | null | undefined): boolean {
    return value === true || value === 't' || value === 'true';
}

function stage(id: string, count: number, parentCount: number | null): GqlSCookAnalyticsFunnelStage {
    return {
        id,
        count,
        stepRate: parentCount == null ? null : rate(count, parentCount),
    };
}

function buildFunnel(
    channel: CookAnalyticsFunnelChannel,
    counts: {
        entry: number;
        opened: number;
        declined?: number;
        offerSent: number;
        bothAccepted: number;
        paid: number;
    },
): GqlSCookAnalyticsFunnel {
    const entryId = channel === 'DIRECT' ? 'requested_you' : 'in_pool';
    const stages: GqlSCookAnalyticsFunnelStage[] = [stage(entryId, counts.entry, null), stage('opened', counts.opened, counts.entry)];
    if (channel === 'POOL') {
        stages.push(stage('declined', counts.declined ?? 0, counts.opened));
    }
    stages.push(
        stage('offer_sent', counts.offerSent, counts.opened),
        stage('both_accepted', counts.bothAccepted, counts.offerSent),
        stage('paid', counts.paid, counts.bothAccepted),
    );
    return {
        channel,
        entryCount: counts.entry,
        stages,
    };
}

function buildOfferCreateStages(
    interactionRows: OfferCreateInteractionRow[],
    offerRows: OfferCreateOfferRow[],
): GqlSCookAnalyticsOfferCreateStage[] {
    const reachedByRequest = new Map<string, Set<string>>();
    const enteredByStep = new Map<string, Set<string>>();
    const withOffer = new Set(offerRows.map((row) => row.booking_request_id));

    function mark(map: Map<string, Set<string>>, step: string, bookingRequestId: string) {
        const set = map.get(step) ?? new Set<string>();
        set.add(bookingRequestId);
        map.set(step, set);
    }

    for (const row of interactionRows) {
        const bookingRequestId = row.booking_request_id;
        const reached = reachedByRequest.get(bookingRequestId) ?? new Set<string>();
        reached.add(row.step);
        reachedByRequest.set(bookingRequestId, reached);
        if (row.interaction_type === 'step_entered') {
            mark(enteredByStep, row.step, bookingRequestId);
        }
    }

    function reachedCount(predicate: (reached: Set<string>, bookingRequestId: string) => boolean): number {
        const ids = new Set<string>();
        for (const [bookingRequestId, reached] of reachedByRequest) {
            if (predicate(reached, bookingRequestId)) ids.add(bookingRequestId);
        }
        for (const bookingRequestId of withOffer) {
            if (predicate(reachedByRequest.get(bookingRequestId) ?? new Set(), bookingRequestId)) {
                ids.add(bookingRequestId);
            }
        }
        return ids.size;
    }

    const offerCreateCompleted = reachedCount(
        (reached, id) =>
            reached.has('offer_create') || reached.has('menus') || reached.has('price') || reached.has('message') || withOffer.has(id),
    );
    const menusCompleted = reachedCount(
        (reached, id) => reached.has('menus') || reached.has('price') || reached.has('message') || withOffer.has(id),
    );
    const priceCompleted = reachedCount((reached, id) => reached.has('price') || reached.has('message') || withOffer.has(id));
    const messageCompleted = reachedCount((reached, id) => reached.has('message') || withOffer.has(id));
    const createdCompleted = withOffer.size;

    const completedById: Record<string, number> = {
        offer_create: offerCreateCompleted,
        menus: menusCompleted,
        price: priceCompleted,
        message: messageCompleted,
        created: createdCompleted,
    };

    const stepIds = ['offer_create', 'menus', 'price', 'message', 'created'] as const;
    const stages: GqlSCookAnalyticsOfferCreateStage[] = [];
    let previousCompleted = 0;

    for (const [index, id] of stepIds.entries()) {
        const completed = completedById[id] ?? 0;
        const enteredFromEvents = enteredByStep.get(id)?.size ?? 0;
        const enteredCount = id === 'created' ? completed : Math.max(completed, enteredFromEvents);
        stages.push({
            id,
            enteredCount,
            completedCount: completed,
            stepRate: index === 0 ? null : rate(completed, previousCompleted),
        });
        previousCompleted = completed;
    }

    return stages;
}

/**
 * Cook-facing analytics for `/profile/analytics` and the overview strip.
 * Returns null when `COOK_ANALYTICS` is off for this cook.
 */
export async function cookAnalyticsFind(
    parent: GqlSCook,
    args: GqlSCookAnalyticsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookAnalytics | null> {
    try {
        const enabled = await featureToggleIsEnabled('COOK_ANALYTICS', serverRuntime, parent.cookId);
        if (!enabled) {
            return null;
        }

        const period = args.period ?? 'PAST_MONTH';
        const channel: CookAnalyticsChannel = args.channel ?? 'ALL';
        const { startDateTime, endDateTime } = cookAnalyticsPeriodRange(period);
        const cookId = parent.cookId;

        const channelPredicate =
            channel === 'DIRECT' ? sql`lead_channel = 'DIRECT'` : channel === 'POOL' ? sql`lead_channel = 'POOL'` : sql`TRUE`;

        const offerChannelJoinPredicate =
            channel === 'DIRECT'
                ? sql`br."requestedCookId" = ${cookId}`
                : channel === 'POOL'
                  ? sql`(br."requestedCookId" IS NULL OR br."requestedCookId" <> ${cookId})`
                  : sql`TRUE`;

        const result = await serverRuntime.db.execute<AggregateRow>(sql`
            WITH cohort AS (
                SELECT
                    brc."bookingRequestId" AS booking_request_id,
                    brc."notifiedAt" AS notified_at,
                    brc."firstOpenedAt" AS first_opened_at,
                    brc."declinedAt" AS declined_at,
                    CASE
                        WHEN br."requestedCookId" = ${cookId} THEN 'DIRECT'
                        ELSE 'POOL'
                    END AS lead_channel,
                    o."bookingRequestOfferId" AS offer_id,
                    o."createdAt" AS offer_created_at,
                    o."userAccepted" AS user_accepted,
                    o."cookAccepted" AS cook_accepted,
                    o."paymentStatus" AS payment_status
                FROM "BookingRequestCooks" brc
                INNER JOIN "BookingRequests" br ON br."bookingRequestId" = brc."bookingRequestId"
                LEFT JOIN "BookingRequestOffers" o
                    ON o."cookId" = brc."cookId"
                   AND o."bookingRequestId" = brc."bookingRequestId"
                WHERE brc."cookId" = ${cookId}
                  AND brc."notifiedAt" IS NOT NULL
                  AND brc."notifiedAt" >= ${startDateTime}
                  AND brc."notifiedAt" <= ${endDateTime}
            ),
            interactions AS (
                SELECT DISTINCT e.payload->>'bookingRequestId' AS booking_request_id
                FROM "SessionEvents" e
                INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
                WHERE s."userId" = ${cookId}
                  AND s."isBot" = false
                  AND s."impersonationReturnSessionId" IS NULL
                  AND e.type = 'WEB_PAGE_INTERACTION'
                  AND e.payload->>'area' = ${cookBookingRequestOfferFunnelArea}
                  AND e.payload->'interaction'->>'type' IN ('step_entered', 'step_completed')
                  AND e.payload->'interaction'->>'step' IN ('offer_create', 'menus', 'price', 'message')
                  AND e.payload->>'bookingRequestId' IS NOT NULL
            ),
            cohort_enriched AS (
                SELECT
                    c.*,
                    (i.booking_request_id IS NOT NULL) AS has_create_ui,
                    (
                        c.first_opened_at IS NOT NULL
                        OR c.declined_at IS NOT NULL
                        OR c.offer_id IS NOT NULL
                        OR i.booking_request_id IS NOT NULL
                    ) AS is_opened
                FROM cohort c
                LEFT JOIN interactions i ON i.booking_request_id = c.booking_request_id
            ),
            pool_metrics AS (
                SELECT
                    COUNT(*) FILTER (WHERE ${channelPredicate})::int AS requests_notified_count,
                    COUNT(*) FILTER (WHERE is_opened AND ${channelPredicate})::int AS requests_opened_count,
                    COUNT(*) FILTER (
                        WHERE declined_at IS NOT NULL AND ${channelPredicate}
                    )::int AS requests_declined_count,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (
                        ORDER BY EXTRACT(EPOCH FROM (first_opened_at - notified_at)) / 60.0
                    ) FILTER (
                        WHERE first_opened_at IS NOT NULL
                          AND first_opened_at >= notified_at
                          AND ${channelPredicate}
                    ) AS median_notify_to_open_minutes,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (
                        ORDER BY EXTRACT(EPOCH FROM (offer_created_at - notified_at)) / 60.0
                    ) FILTER (
                        WHERE offer_created_at IS NOT NULL
                          AND offer_created_at >= notified_at
                          AND ${channelPredicate}
                    ) AS median_notify_to_offer_minutes,
                    COUNT(*) FILTER (WHERE lead_channel = 'DIRECT')::int AS direct_entry_count,
                    COUNT(*) FILTER (WHERE lead_channel = 'DIRECT' AND is_opened)::int AS direct_opened_count,
                    COUNT(*) FILTER (WHERE lead_channel = 'DIRECT' AND offer_id IS NOT NULL)::int AS direct_offer_sent_count,
                    COUNT(*) FILTER (
                        WHERE lead_channel = 'DIRECT'
                          AND offer_id IS NOT NULL
                          AND user_accepted = true
                          AND cook_accepted = true
                    )::int AS direct_both_accepted_count,
                    COUNT(*) FILTER (
                        WHERE lead_channel = 'DIRECT'
                          AND payment_status IN ('PAYED', 'TRANSFERRED', 'PAYED_OUT_OF_SYSTEM')
                    )::int AS direct_paid_count,
                    COUNT(*) FILTER (WHERE lead_channel = 'POOL')::int AS pool_entry_count,
                    COUNT(*) FILTER (WHERE lead_channel = 'POOL' AND is_opened)::int AS pool_opened_count,
                    COUNT(*) FILTER (
                        WHERE lead_channel = 'POOL'
                          AND declined_at IS NOT NULL
                          AND NOT has_create_ui
                          AND offer_id IS NULL
                    )::int AS pool_declined_count,
                    COUNT(*) FILTER (WHERE lead_channel = 'POOL' AND offer_id IS NOT NULL)::int AS pool_offer_sent_count,
                    COUNT(*) FILTER (
                        WHERE lead_channel = 'POOL'
                          AND offer_id IS NOT NULL
                          AND user_accepted = true
                          AND cook_accepted = true
                    )::int AS pool_both_accepted_count,
                    COUNT(*) FILTER (
                        WHERE lead_channel = 'POOL'
                          AND payment_status IN ('PAYED', 'TRANSFERRED', 'PAYED_OUT_OF_SYSTEM')
                    )::int AS pool_paid_count
                FROM cohort_enriched
            ),
            offers AS (
                SELECT
                    COUNT(*) FILTER (
                        WHERE o."createdAt" >= ${startDateTime}
                          AND o."createdAt" <= ${endDateTime}
                          AND ${offerChannelJoinPredicate}
                    )::int AS offers_created_count,
                    COUNT(*) FILTER (
                        WHERE o."createdAt" >= ${startDateTime}
                          AND o."createdAt" <= ${endDateTime}
                          AND o."userAccepted" = true
                          AND o."cookAccepted" = true
                          AND ${offerChannelJoinPredicate}
                    )::int AS offers_accepted_count,
                    COUNT(*) FILTER (
                        WHERE o."paymentStatus" IN ('PAYED', 'TRANSFERRED', 'PAYED_OUT_OF_SYSTEM')
                          AND COALESCE(o."paymentDateTime", o."createdAt") >= ${startDateTime}
                          AND COALESCE(o."paymentDateTime", o."createdAt") <= ${endDateTime}
                          AND ${offerChannelJoinPredicate}
                    )::int AS offers_paid_count,
                    COALESCE(
                        SUM(o."payoutCentsCook") FILTER (
                            WHERE o."paymentStatus" IN ('PAYED', 'TRANSFERRED', 'PAYED_OUT_OF_SYSTEM')
                              AND COALESCE(o."paymentDateTime", o."createdAt") >= ${startDateTime}
                              AND COALESCE(o."paymentDateTime", o."createdAt") <= ${endDateTime}
                              AND ${offerChannelJoinPredicate}
                        ),
                        0
                    )::int AS paid_payout_cents_cook_total,
                    AVG(o."menuPriceCents") FILTER (
                        WHERE o."createdAt" >= ${startDateTime}
                          AND o."createdAt" <= ${endDateTime}
                          AND ${offerChannelJoinPredicate}
                    )::float AS average_menu_price_cents,
                    AVG(participant_counts.participant_count) FILTER (
                        WHERE o."createdAt" >= ${startDateTime}
                          AND o."createdAt" <= ${endDateTime}
                          AND ${offerChannelJoinPredicate}
                    )::float AS average_participants
                FROM "BookingRequestOffers" o
                INNER JOIN "BookingRequests" br ON br."bookingRequestId" = o."bookingRequestId"
                LEFT JOIN LATERAL (
                    SELECT COUNT(*)::int AS participant_count
                    FROM "BookingRequestParticipants" p
                    WHERE p."bookingRequestId" = o."bookingRequestId"
                ) participant_counts ON true
                WHERE o."cookId" = ${cookId}
            ),
            visits AS (
                SELECT COUNT(*)::int AS public_profile_view_count
                FROM "SessionEvents" e
                INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
                WHERE e.type = 'WEB_PAGE_VISITED'
                  AND e.payload->>'webPageKey' = 'CHEFS'
                  AND e.payload->'params'->>'cookId' = ${cookId}
                  AND s."isBot" = false
                  AND s."impersonationReturnSessionId" IS NULL
                  AND e."createdAt" >= ${startDateTime}
                  AND e."createdAt" <= ${endDateTime}
            ),
            lifetime AS (
                SELECT (
                    EXISTS (
                        SELECT 1
                        FROM "BookingRequestCooks" brc
                        WHERE brc."cookId" = ${cookId}
                          AND brc."notifiedAt" IS NOT NULL
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM "BookingRequestOffers" o
                        WHERE o."cookId" = ${cookId}
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM "SessionEvents" e
                        INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
                        WHERE e.type = 'WEB_PAGE_VISITED'
                          AND e.payload->>'webPageKey' = 'CHEFS'
                          AND e.payload->'params'->>'cookId' = ${cookId}
                          AND s."isBot" = false
                          AND s."impersonationReturnSessionId" IS NULL
                    )
                ) AS has_insights
            )
            SELECT
                pool_metrics.requests_notified_count,
                pool_metrics.requests_opened_count,
                pool_metrics.requests_declined_count,
                pool_metrics.median_notify_to_open_minutes,
                pool_metrics.median_notify_to_offer_minutes,
                pool_metrics.direct_entry_count,
                pool_metrics.direct_opened_count,
                pool_metrics.direct_offer_sent_count,
                pool_metrics.direct_both_accepted_count,
                pool_metrics.direct_paid_count,
                pool_metrics.pool_entry_count,
                pool_metrics.pool_opened_count,
                pool_metrics.pool_declined_count,
                pool_metrics.pool_offer_sent_count,
                pool_metrics.pool_both_accepted_count,
                pool_metrics.pool_paid_count,
                offers.offers_created_count,
                offers.offers_accepted_count,
                offers.offers_paid_count,
                offers.paid_payout_cents_cook_total,
                offers.average_menu_price_cents,
                offers.average_participants,
                visits.public_profile_view_count,
                lifetime.has_insights
            FROM pool_metrics, offers, visits, lifetime
        `);

        const row = rowsFromExecute(result)[0];
        if (!row) {
            throw new Error('cookAnalyticsFind returned no row');
        }

        const offerCreateChannelSql =
            channel === 'DIRECT'
                ? sql`AND br."requestedCookId" = ${cookId}`
                : channel === 'POOL'
                  ? sql`AND (br."requestedCookId" IS NULL OR br."requestedCookId" <> ${cookId})`
                  : sql``;

        const truncUnit = period === 'PAST_QUARTER' || period === 'PAST_YEAR' ? 'week' : 'day';
        const step = truncUnit === 'week' ? sql`interval '1 week'` : sql`interval '1 day'`;
        const truncLiteral = sql.raw(`'${truncUnit}'`);

        const [interactionResult, offerCreateOfferResult, trendResult] = await Promise.all([
            serverRuntime.db.execute<OfferCreateInteractionRow>(sql`
                SELECT
                    e.payload->>'bookingRequestId' AS booking_request_id,
                    e.payload->'interaction'->>'step' AS step,
                    e.payload->'interaction'->>'type' AS interaction_type
                FROM "SessionEvents" e
                INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
                INNER JOIN "BookingRequestCooks" brc
                    ON brc."cookId" = ${cookId}
                   AND brc."bookingRequestId" = e.payload->>'bookingRequestId'
                INNER JOIN "BookingRequests" br ON br."bookingRequestId" = brc."bookingRequestId"
                WHERE s."userId" = ${cookId}
                  AND s."isBot" = false
                  AND s."impersonationReturnSessionId" IS NULL
                  AND brc."notifiedAt" IS NOT NULL
                  AND brc."notifiedAt" >= ${startDateTime}
                  AND brc."notifiedAt" <= ${endDateTime}
                  AND e.type = 'WEB_PAGE_INTERACTION'
                  AND e.payload->>'area' = ${cookBookingRequestOfferFunnelArea}
                  AND e.payload->'interaction'->>'type' IN ('step_entered', 'step_completed')
                  AND e.payload->'interaction'->>'step' IN ('offer_create', 'menus', 'price', 'message')
                  AND e.payload->>'bookingRequestId' IS NOT NULL
                  ${offerCreateChannelSql}
            `),
            serverRuntime.db.execute<OfferCreateOfferRow>(sql`
                SELECT DISTINCT o."bookingRequestId" AS booking_request_id
                FROM "BookingRequestOffers" o
                INNER JOIN "BookingRequestCooks" brc
                    ON brc."cookId" = o."cookId"
                   AND brc."bookingRequestId" = o."bookingRequestId"
                INNER JOIN "BookingRequests" br ON br."bookingRequestId" = o."bookingRequestId"
                WHERE o."cookId" = ${cookId}
                  AND brc."notifiedAt" IS NOT NULL
                  AND brc."notifiedAt" >= ${startDateTime}
                  AND brc."notifiedAt" <= ${endDateTime}
                  ${offerCreateChannelSql}
            `),
            serverRuntime.db.execute<TrendRow>(sql`
                SELECT
                    series.bucket_start AS bucket_start,
                    COALESCE(visits.value, 0)::int AS public_profile_view_count,
                    COALESCE(created.value, 0)::int AS offers_created_count,
                    COALESCE(paid.value, 0)::int AS offers_paid_count
                FROM generate_series(
                    date_trunc(${truncLiteral}, ${startDateTime}::timestamptz),
                    date_trunc(${truncLiteral}, ${endDateTime}::timestamptz),
                    ${step}
                ) AS series(bucket_start)
                LEFT JOIN (
                    SELECT
                        date_trunc(${truncLiteral}, e."createdAt") AS bucket_start,
                        COUNT(*)::int AS value
                    FROM "SessionEvents" e
                    INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
                    WHERE e.type = 'WEB_PAGE_VISITED'
                      AND e.payload->>'webPageKey' = 'CHEFS'
                      AND e.payload->'params'->>'cookId' = ${cookId}
                      AND s."isBot" = false
                      AND s."impersonationReturnSessionId" IS NULL
                      AND e."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                      AND e."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
                    GROUP BY 1
                ) AS visits ON visits.bucket_start = series.bucket_start
                LEFT JOIN (
                    SELECT
                        date_trunc(${truncLiteral}, o."createdAt") AS bucket_start,
                        COUNT(*)::int AS value
                    FROM "BookingRequestOffers" o
                    INNER JOIN "BookingRequests" br ON br."bookingRequestId" = o."bookingRequestId"
                    WHERE o."cookId" = ${cookId}
                      AND o."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                      AND o."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
                      AND ${offerChannelJoinPredicate}
                    GROUP BY 1
                ) AS created ON created.bucket_start = series.bucket_start
                LEFT JOIN (
                    SELECT
                        date_trunc(${truncLiteral}, COALESCE(o."paymentDateTime", o."createdAt")) AS bucket_start,
                        COUNT(*)::int AS value
                    FROM "BookingRequestOffers" o
                    INNER JOIN "BookingRequests" br ON br."bookingRequestId" = o."bookingRequestId"
                    WHERE o."cookId" = ${cookId}
                      AND o."paymentStatus" IN ('PAYED', 'TRANSFERRED', 'PAYED_OUT_OF_SYSTEM')
                      AND COALESCE(o."paymentDateTime", o."createdAt") >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                      AND COALESCE(o."paymentDateTime", o."createdAt") < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
                      AND ${offerChannelJoinPredicate}
                    GROUP BY 1
                ) AS paid ON paid.bucket_start = series.bucket_start
                ORDER BY series.bucket_start ASC
            `),
        ]);

        const requestsNotifiedCount = parseIntCount(row.requests_notified_count);
        const requestsOpenedCount = parseIntCount(row.requests_opened_count);
        const requestsDeclinedCount = parseIntCount(row.requests_declined_count);
        const offersCreatedCount = parseIntCount(row.offers_created_count);
        const offersAcceptedCount = parseIntCount(row.offers_accepted_count);

        const directFunnel = buildFunnel('DIRECT', {
            entry: parseIntCount(row.direct_entry_count),
            opened: parseIntCount(row.direct_opened_count),
            offerSent: parseIntCount(row.direct_offer_sent_count),
            bothAccepted: parseIntCount(row.direct_both_accepted_count),
            paid: parseIntCount(row.direct_paid_count),
        });
        const poolFunnel = buildFunnel('POOL', {
            entry: parseIntCount(row.pool_entry_count),
            opened: parseIntCount(row.pool_opened_count),
            declined: parseIntCount(row.pool_declined_count),
            offerSent: parseIntCount(row.pool_offer_sent_count),
            bothAccepted: parseIntCount(row.pool_both_accepted_count),
            paid: parseIntCount(row.pool_paid_count),
        });

        const funnels = channel === 'DIRECT' ? [directFunnel] : channel === 'POOL' ? [poolFunnel] : [directFunnel, poolFunnel];

        const trend: GqlSCookAnalyticsTrendPoint[] = rowsFromExecute(trendResult).map((trendRow) => ({
            bucketStart: trendRow.bucket_start instanceof Date ? trendRow.bucket_start : new Date(trendRow.bucket_start),
            publicProfileViewCount: parseIntCount(trendRow.public_profile_view_count),
            offersCreatedCount: parseIntCount(trendRow.offers_created_count),
            offersPaidCount: parseIntCount(trendRow.offers_paid_count),
        }));

        return {
            period,
            channel,
            range: {
                startDateTime,
                endDateTime,
            },
            hasInsights: isTruthyFlag(row.has_insights),
            publicProfileViewCount: parseIntCount(row.public_profile_view_count),
            requestsNotifiedCount,
            requestsOpenedCount,
            requestsDeclinedCount,
            openRate: rate(requestsOpenedCount, requestsNotifiedCount),
            declineRate: rate(requestsDeclinedCount, requestsOpenedCount),
            offerCreateRate: rate(offersCreatedCount, requestsOpenedCount),
            medianNotifyToOpenMinutes: parseNullableFloat(row.median_notify_to_open_minutes),
            medianNotifyToOfferMinutes: parseNullableFloat(row.median_notify_to_offer_minutes),
            offersCreatedCount,
            offersAcceptedCount,
            offerConversionRate: rate(offersAcceptedCount, offersCreatedCount),
            offersPaidCount: parseIntCount(row.offers_paid_count),
            paidPayoutCentsCookTotal: parseIntCount(row.paid_payout_cents_cook_total),
            averageMenuPriceCents: parseNullableInt(row.average_menu_price_cents),
            averageParticipants: parseNullableFloat(row.average_participants),
            funnels,
            offerCreateStages: buildOfferCreateStages(rowsFromExecute(interactionResult), rowsFromExecute(offerCreateOfferResult)),
            trend,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
