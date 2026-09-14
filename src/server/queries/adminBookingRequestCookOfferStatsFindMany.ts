import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestCookOfferStat, GqlSAdminBookingRequestCookOfferStatsArgs, GqlSSession } from '../graphql/generated';
import { findManyTake } from '../utils/findManyTake';

/** Top cooks by offer count or dual-accept conversions (all-time). */
export async function adminBookingRequestCookOfferStatsFindMany(
    args: GqlSAdminBookingRequestCookOfferStatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestCookOfferStat[]> {
    try {
        const take = findManyTake(args.take);
        const sortBy = args.sortBy ?? 'offerCount';
        const orderClause =
            sortBy === 'conversionCount' ? sql`conversion_count DESC, display_name ASC` : sql`offer_count DESC, display_name ASC`;
        const havingClause =
            sortBy === 'conversionCount'
                ? sql`HAVING COUNT(*) FILTER (
                WHERE o."userAccepted" = true AND o."cookAccepted" = true
            ) > 0`
                : sql``;

        const result = await serverRuntime.db.execute<{
            cook_id: string;
            display_name: string;
            offer_count: string | number;
            conversion_count: string | number;
        }>(sql`
            SELECT
                o."cookId" AS cook_id,
                u."firstName" AS display_name,
                COUNT(*)::int AS offer_count,
                COUNT(*) FILTER (
                    WHERE o."userAccepted" = true AND o."cookAccepted" = true
                )::int AS conversion_count
            FROM "BookingRequestOffers" o
            INNER JOIN "Users" u ON u."userId" = o."cookId"
            GROUP BY o."cookId", u."firstName"
            ${havingClause}
            ORDER BY ${orderClause}
            LIMIT ${take}
        `);

        const rows = Array.isArray(result) ? result : result.rows;

        return rows.map((row) => ({
            cookId: row.cook_id,
            displayName: row.display_name,
            offerCount: typeof row.offer_count === 'number' ? row.offer_count : Number(row.offer_count),
            conversionCount: typeof row.conversion_count === 'number' ? row.conversion_count : Number(row.conversion_count),
        }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
