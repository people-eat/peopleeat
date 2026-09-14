import { and, desc, eq, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';

import { bookingRequestCooks, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookBookingRequest, GqlSCookBookingRequestsArgs, GqlSSession } from '../graphql/generated';
import { cookBookingRequestHydrate } from '../utils/cookBookingRequestHydrate';
import { cookIsEligibleForBookingRequestPool } from '../utils/cookBookingRequestPoolEligibility';

export async function cookBookingRequestFindMany(
    { cookId }: GqlSCook,
    args: GqlSCookBookingRequestsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookBookingRequest[]> {
    try {
        const criterion = args.criterion;
        const [cook] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, cookId)).limit(1);
        if (!cook) {
            return [];
        }

        const onlyDeclined = criterion?.onlyDeclined === true;
        const now = new Date();

        const rows = await serverRuntime.db
            .select({
                bookingRequest: bookingRequests,
                details: bookingRequestCooks,
                hasAcceptedOffer: sql<boolean>`EXISTS (
                    SELECT 1 FROM ${bookingRequestOffers}
                    WHERE ${bookingRequestOffers.bookingRequestId} = ${bookingRequests.bookingRequestId}
                      AND ${bookingRequestOffers.userAccepted} = true
                      AND ${bookingRequestOffers.cookAccepted} = true
                )`.as('hasAcceptedOffer'),
            })
            .from(bookingRequests)
            .leftJoin(
                bookingRequestOffers,
                and(eq(bookingRequestOffers.bookingRequestId, bookingRequests.bookingRequestId), eq(bookingRequestOffers.cookId, cookId)),
            )
            .leftJoin(
                bookingRequestCooks,
                and(eq(bookingRequestCooks.bookingRequestId, bookingRequests.bookingRequestId), eq(bookingRequestCooks.cookId, cookId)),
            )
            .where(
                and(
                    ne(bookingRequests.userId, cookId),
                    isNull(bookingRequests.canceledAt),
                    or(isNull(bookingRequests.expiresAt), sql`${bookingRequests.expiresAt} >= ${now.toISOString()}`),
                    isNull(bookingRequestOffers.bookingRequestOfferId),
                    or(
                        eq(bookingRequests.publicationStatus, 'PUBLICATION_AUTO_APPROVED'),
                        and(
                            eq(bookingRequests.publicationStatus, 'PUBLICATION_APPROVED_BY_ADMIN'),
                            isNotNull(bookingRequestCooks.notifiedAt),
                        ),
                    ),
                    onlyDeclined ? isNotNull(bookingRequestCooks.declinedAt) : isNull(bookingRequestCooks.declinedAt),
                ),
            )
            .orderBy(desc(bookingRequests.createdAt));
        const visible = rows.filter((row) => {
            if (row.hasAcceptedOffer) {
                return false;
            }
            return cookIsEligibleForBookingRequestPool(cook, row.bookingRequest, row.details);
        });

        return cookBookingRequestHydrate(cook, visible, serverRuntime);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
