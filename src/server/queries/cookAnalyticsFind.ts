import { sql } from 'drizzle-orm';

import { cookAnalyticsPeriodRange } from '../../shared/cookAnalyticsPeriod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookAnalytics, GqlSCookAnalyticsArgs, GqlSSession } from '../graphql/generated';
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
        const { startDateTime, endDateTime } = cookAnalyticsPeriodRange(period);

        const result = await serverRuntime.db.execute<AggregateRow>(sql`
            WITH pool AS (
                SELECT
                    COUNT(*) FILTER (
                        WHERE brc."notifiedAt" IS NOT NULL
                          AND brc."notifiedAt" >= ${startDateTime}
                          AND brc."notifiedAt" <= ${endDateTime}
                    )::int AS requests_notified_count,
                    COUNT(*) FILTER (
                        WHERE brc."notifiedAt" IS NOT NULL
                          AND brc."notifiedAt" >= ${startDateTime}
                          AND brc."notifiedAt" <= ${endDateTime}
                          AND brc."firstOpenedAt" IS NOT NULL
                    )::int AS requests_opened_count,
                    COUNT(*) FILTER (
                        WHERE brc."notifiedAt" IS NOT NULL
                          AND brc."notifiedAt" >= ${startDateTime}
                          AND brc."notifiedAt" <= ${endDateTime}
                          AND brc."declinedAt" IS NOT NULL
                    )::int AS requests_declined_count,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (
                        ORDER BY EXTRACT(EPOCH FROM (brc."firstOpenedAt" - brc."notifiedAt")) / 60.0
                    ) FILTER (
                        WHERE brc."notifiedAt" IS NOT NULL
                          AND brc."notifiedAt" >= ${startDateTime}
                          AND brc."notifiedAt" <= ${endDateTime}
                          AND brc."firstOpenedAt" IS NOT NULL
                          AND brc."firstOpenedAt" >= brc."notifiedAt"
                    ) AS median_notify_to_open_minutes
                FROM "BookingRequestCooks" brc
                WHERE brc."cookId" = ${parent.cookId}
            ),
            first_offers AS (
                SELECT DISTINCT ON (o."bookingRequestId")
                    o."createdAt" AS offer_created_at,
                    brc."notifiedAt" AS notified_at
                FROM "BookingRequestOffers" o
                INNER JOIN "BookingRequestCooks" brc
                    ON brc."cookId" = o."cookId"
                   AND brc."bookingRequestId" = o."bookingRequestId"
                WHERE o."cookId" = ${parent.cookId}
                  AND brc."notifiedAt" IS NOT NULL
                  AND brc."notifiedAt" >= ${startDateTime}
                  AND brc."notifiedAt" <= ${endDateTime}
                ORDER BY o."bookingRequestId", o."createdAt" ASC
            ),
            offer_latency AS (
                SELECT
                    PERCENTILE_CONT(0.5) WITHIN GROUP (
                        ORDER BY EXTRACT(EPOCH FROM (fo.offer_created_at - fo.notified_at)) / 60.0
                    ) AS median_notify_to_offer_minutes
                FROM first_offers fo
                WHERE fo.offer_created_at >= fo.notified_at
            ),
            offers AS (
                SELECT
                    COUNT(*) FILTER (
                        WHERE o."createdAt" >= ${startDateTime}
                          AND o."createdAt" <= ${endDateTime}
                    )::int AS offers_created_count,
                    COUNT(*) FILTER (
                        WHERE o."createdAt" >= ${startDateTime}
                          AND o."createdAt" <= ${endDateTime}
                          AND o."userAccepted" = true
                          AND o."cookAccepted" = true
                    )::int AS offers_accepted_count,
                    COUNT(*) FILTER (
                        WHERE o."paymentStatus" IN ('PAYED', 'TRANSFERRED', 'PAYED_OUT_OF_SYSTEM')
                          AND COALESCE(o."paymentDateTime", o."createdAt") >= ${startDateTime}
                          AND COALESCE(o."paymentDateTime", o."createdAt") <= ${endDateTime}
                    )::int AS offers_paid_count,
                    COALESCE(
                        SUM(o."payoutCentsCook") FILTER (
                            WHERE o."paymentStatus" IN ('PAYED', 'TRANSFERRED', 'PAYED_OUT_OF_SYSTEM')
                              AND COALESCE(o."paymentDateTime", o."createdAt") >= ${startDateTime}
                              AND COALESCE(o."paymentDateTime", o."createdAt") <= ${endDateTime}
                        ),
                        0
                    )::int AS paid_payout_cents_cook_total,
                    AVG(o."menuPriceCents") FILTER (
                        WHERE o."createdAt" >= ${startDateTime}
                          AND o."createdAt" <= ${endDateTime}
                    )::float AS average_menu_price_cents,
                    AVG(participant_counts.participant_count) FILTER (
                        WHERE o."createdAt" >= ${startDateTime}
                          AND o."createdAt" <= ${endDateTime}
                    )::float AS average_participants
                FROM "BookingRequestOffers" o
                LEFT JOIN LATERAL (
                    SELECT COUNT(*)::int AS participant_count
                    FROM "BookingRequestParticipants" p
                    WHERE p."bookingRequestId" = o."bookingRequestId"
                ) participant_counts ON true
                WHERE o."cookId" = ${parent.cookId}
            ),
            visits AS (
                SELECT COUNT(*)::int AS public_profile_view_count
                FROM "SessionEvents" e
                INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
                WHERE e.type = 'WEB_PAGE_VISITED'
                  AND e.payload->>'webPageKey' = 'CHEFS'
                  AND e.payload->'params'->>'cookId' = ${parent.cookId}
                  AND s."isBot" = false
                  AND e."createdAt" >= ${startDateTime}
                  AND e."createdAt" <= ${endDateTime}
            ),
            lifetime AS (
                SELECT (
                    EXISTS (
                        SELECT 1
                        FROM "BookingRequestCooks" brc
                        WHERE brc."cookId" = ${parent.cookId}
                          AND brc."notifiedAt" IS NOT NULL
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM "BookingRequestOffers" o
                        WHERE o."cookId" = ${parent.cookId}
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM "SessionEvents" e
                        INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
                        WHERE e.type = 'WEB_PAGE_VISITED'
                          AND e.payload->>'webPageKey' = 'CHEFS'
                          AND e.payload->'params'->>'cookId' = ${parent.cookId}
                          AND s."isBot" = false
                    )
                ) AS has_insights
            )
            SELECT
                pool.requests_notified_count,
                pool.requests_opened_count,
                pool.requests_declined_count,
                pool.median_notify_to_open_minutes,
                offer_latency.median_notify_to_offer_minutes,
                offers.offers_created_count,
                offers.offers_accepted_count,
                offers.offers_paid_count,
                offers.paid_payout_cents_cook_total,
                offers.average_menu_price_cents,
                offers.average_participants,
                visits.public_profile_view_count,
                lifetime.has_insights
            FROM pool, offer_latency, offers, visits, lifetime
        `);

        const row = rowsFromExecute(result)[0];
        if (!row) {
            throw new Error('cookAnalyticsFind returned no row');
        }

        const requestsNotifiedCount = parseIntCount(row.requests_notified_count);
        const requestsOpenedCount = parseIntCount(row.requests_opened_count);
        const requestsDeclinedCount = parseIntCount(row.requests_declined_count);
        const offersCreatedCount = parseIntCount(row.offers_created_count);
        const offersAcceptedCount = parseIntCount(row.offers_accepted_count);

        return {
            period,
            range: {
                startDateTime,
                endDateTime,
            },
            hasInsights: row.has_insights === true || row.has_insights === 't' || row.has_insights === 'true',
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
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
