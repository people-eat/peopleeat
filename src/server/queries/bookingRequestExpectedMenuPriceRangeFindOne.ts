import { sql } from 'drizzle-orm';

import { bookingRequestExpectedMenuPriceRangeCalculate } from '../../shared/bookingRequestExpectedMenuPriceRange';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSBookingRequestExpectedMenuPriceRange, GqlSQueryBookingRequestExpectedMenuPriceRangeArgs } from '../graphql/generated';

type OfferMenuPriceSampleRow = {
    menuPriceCents: number;
    participantsAdult: number | string;
    participantsDiscounted: number | string;
};

function toCount(value: number | string): number {
    return typeof value === 'number' ? value : Number.parseInt(value, 10);
}

/**
 * Public expected total menu-price band for a requested headcount.
 * Built from historical offers (accepted and not) with local → global → static prior fallback.
 */
export async function bookingRequestExpectedMenuPriceRangeFindOne(
    args: Pick<GqlSQueryBookingRequestExpectedMenuPriceRangeArgs, 'participantsAdult' | 'participantsDiscounted'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSBookingRequestExpectedMenuPriceRange> {
    const result = await serverRuntime.db.execute<OfferMenuPriceSampleRow>(sql`
        SELECT
            o."menuPriceCents" AS "menuPriceCents",
            COUNT(*) FILTER (WHERE p.type = 'ADULT')::int AS "participantsAdult",
            COUNT(*) FILTER (WHERE p.type = 'DISCOUNTED')::int AS "participantsDiscounted"
        FROM "BookingRequestOffers" o
        INNER JOIN "BookingRequestParticipants" p ON p."bookingRequestId" = o."bookingRequestId"
        WHERE o."menuPriceCents" > 0
        GROUP BY o."bookingRequestOfferId", o."menuPriceCents"
    `);

    const rows = Array.isArray(result) ? result : result.rows;
    const samples = rows.map((row) => ({
        menuPriceCents: row.menuPriceCents,
        participantsAdult: toCount(row.participantsAdult),
        participantsDiscounted: toCount(row.participantsDiscounted),
    }));

    return bookingRequestExpectedMenuPriceRangeCalculate({
        participantsAdult: args.participantsAdult,
        participantsDiscounted: args.participantsDiscounted,
        samples,
    });
}
