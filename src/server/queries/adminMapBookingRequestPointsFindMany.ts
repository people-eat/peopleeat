import { and, gte, inArray, lte } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import { bookingRequestStatusDerive } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMapBookingRequestPoint, GqlSAdminMapBookingRequestsArgs, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

export async function adminMapBookingRequestPointsFindMany(
    args: GqlSAdminMapBookingRequestsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminMapBookingRequestPoint[]> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);

        const rows = await serverRuntime.db
            .select({
                bookingRequestId: bookingRequests.bookingRequestId,
                occasion: bookingRequests.occasion,
                dateTime: bookingRequests.dateTime,
                exactEventAddress: bookingRequests.exactEventAddress,
                publicationStatus: bookingRequests.publicationStatus,
                canceledAt: bookingRequests.canceledAt,
                expiresAt: bookingRequests.expiresAt,
            })
            .from(bookingRequests)
            .where(and(gte(bookingRequests.createdAt, startDateTime), lte(bookingRequests.createdAt, endDateTime)));

        if (rows.length === 0) return [];

        const bookingRequestIds = rows.map((row) => row.bookingRequestId);
        const offerRows = await serverRuntime.db
            .select({
                bookingRequestId: bookingRequestOffers.bookingRequestId,
                userAccepted: bookingRequestOffers.userAccepted,
                cookAccepted: bookingRequestOffers.cookAccepted,
                paymentStatus: bookingRequestOffers.paymentStatus,
            })
            .from(bookingRequestOffers)
            .where(inArray(bookingRequestOffers.bookingRequestId, bookingRequestIds));

        const offersByRequest = new Map<string, typeof offerRows>();
        for (const offer of offerRows) {
            const list = offersByRequest.get(offer.bookingRequestId) ?? [];
            list.push(offer);
            offersByRequest.set(offer.bookingRequestId, list);
        }

        const now = new Date();
        return rows.map((row) => {
            const offers = offersByRequest.get(row.bookingRequestId) ?? [];
            const accepted = offers.find((offer) => offer.userAccepted === true && offer.cookAccepted === true);
            return {
                bookingRequestId: row.bookingRequestId,
                latitude: row.exactEventAddress.latitude,
                longitude: row.exactEventAddress.longitude,
                status: bookingRequestStatusDerive({
                    offerCount: offers.length,
                    acceptedOfferPaymentStatus: accepted?.paymentStatus ?? null,
                    canceledAt: row.canceledAt,
                    expiresAt: row.expiresAt,
                    eventDate: row.dateTime,
                    now,
                }),
                publicationStatus: row.publicationStatus,
                dateTime: row.dateTime,
                occasion: row.occasion,
            };
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
