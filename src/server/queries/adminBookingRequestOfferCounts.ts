import { count } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestOfferCriterion, GqlSAdminBookingRequestOffersCountsArgs, GqlSSession } from '../graphql/generated';
import { adminBookingRequestOfferCriterionWhere } from '../utils/adminBookingRequestOfferCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminBookingRequestOfferCountOne(
    criterion: GqlSAdminBookingRequestOfferCriterion,
    serverRuntime: ServerRuntime,
): Promise<number> {
    const where = adminBookingRequestOfferCriterionWhere(criterion);
    const [row] = await serverRuntime.db.select({ value: count() }).from(bookingRequestOffers).where(where);
    return row?.value ?? 0;
}

export async function adminBookingRequestOfferCounts(
    args: GqlSAdminBookingRequestOffersCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminBookingRequestOfferCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminBookingRequestOfferCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminBookingRequestOfferCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
