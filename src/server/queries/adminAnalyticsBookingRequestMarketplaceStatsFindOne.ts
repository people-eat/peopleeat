import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsBookingRequestMarketplaceStats, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

function parseCount(value: string | number | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return 0;
}

/** Request-row marketplace counts in range (createdAt). Not GMV. */
export async function adminAnalyticsBookingRequestMarketplaceStatsFindOne(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsBookingRequestMarketplaceStats> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(range);

        const result = await serverRuntime.db.execute<{
            request_count: string | number;
            with_offer_count: string | number;
            dual_accepted_count: string | number;
            paid_count: string | number;
            payment_failed_count: string | number;
            chef_direct_count: string | number;
            radius_count: string | number;
        }>(sql`
            SELECT
                COUNT(*)::int AS request_count,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM "BookingRequestOffers" o
                        WHERE o."bookingRequestId" = br."bookingRequestId"
                    )
                )::int AS with_offer_count,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM "BookingRequestOffers" o
                        WHERE o."bookingRequestId" = br."bookingRequestId"
                          AND o."userAccepted" = true
                          AND o."cookAccepted" = true
                    )
                )::int AS dual_accepted_count,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM "BookingRequestOffers" o
                        WHERE o."bookingRequestId" = br."bookingRequestId"
                          AND o."paymentStatus" IN ('PAYED', 'TRANSFERRED', 'PAYED_OUT_OF_SYSTEM')
                    )
                )::int AS paid_count,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM "BookingRequestOffers" o
                        WHERE o."bookingRequestId" = br."bookingRequestId"
                          AND o."paymentStatus" = 'FAILED'
                    )
                )::int AS payment_failed_count,
                COUNT(*) FILTER (WHERE br."publicationStatus" = 'PUBLICATION_DIRECT_TO_COOK')::int AS chef_direct_count,
                COUNT(*) FILTER (WHERE br."publicationStatus" <> 'PUBLICATION_DIRECT_TO_COOK')::int AS radius_count
            FROM "BookingRequests" br
            WHERE br."createdAt" >= ${startDateTime}
              AND br."createdAt" <= ${endDateTime}
        `);

        const rows = Array.isArray(result) ? result : result.rows;
        const row = rows[0];
        return {
            requestCount: parseCount(row?.request_count),
            withOfferCount: parseCount(row?.with_offer_count),
            dualAcceptedCount: parseCount(row?.dual_accepted_count),
            paidCount: parseCount(row?.paid_count),
            paymentFailedCount: parseCount(row?.payment_failed_count),
            chefDirectCount: parseCount(row?.chef_direct_count),
            radiusCount: parseCount(row?.radius_count),
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
