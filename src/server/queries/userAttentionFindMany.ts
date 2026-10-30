import { asc, desc, eq, inArray } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, customerTestimonials } from '../db/schema';
import { bookingRequestOfferStatusDerive, bookingRequestStatusDerive } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { userAttentionDerive } from '../domain/userAttention';
import type { UserAttentionRequest } from '../domain/userAttention';
import type { GqlSSession, GqlSUser, GqlSUserAttentionItem } from '../graphql/generated';

/**
 * Flat selects only (no cook / menu hydration) since this recomputes on every
 * `userUpdates` push. Statuses use the same domain derivations as
 * `User.bookingRequests`; order matches it (newest first).
 */
export async function userAttentionFindMany(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserAttentionItem[] | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    try {
        const requestRows = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.userId, parentUser.userId))
            .orderBy(desc(bookingRequests.createdAt));
        if (requestRows.length === 0) {
            return [];
        }

        const offerRows = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(
                inArray(
                    bookingRequestOffers.bookingRequestId,
                    requestRows.map((row) => row.bookingRequestId),
                ),
            )
            .orderBy(asc(bookingRequestOffers.createdAt));
        const offerIds = offerRows.map((offer) => offer.bookingRequestOfferId);
        const [callRows, testimonialRows] =
            offerIds.length === 0
                ? [[], []]
                : await Promise.all([
                      serverRuntime.db
                          .select({
                              bookingRequestOfferId: cookCallSlotBookings.bookingRequestOfferId,
                              startAt: cookCallSlotBookings.startAt,
                              endAt: cookCallSlotBookings.endAt,
                              status: cookCallSlotBookings.status,
                              initiator: cookCallSlotBookings.initiator,
                          })
                          .from(cookCallSlotBookings)
                          .where(inArray(cookCallSlotBookings.bookingRequestOfferId, offerIds))
                          .orderBy(asc(cookCallSlotBookings.startAt)),
                      serverRuntime.db
                          .select({ bookingRequestOfferId: customerTestimonials.bookingRequestOfferId })
                          .from(customerTestimonials)
                          .where(inArray(customerTestimonials.bookingRequestOfferId, offerIds)),
                  ]);

        const reviewedOfferIds = new Set(testimonialRows.map((row) => row.bookingRequestOfferId));
        const now = new Date();

        const attentionRequests = requestRows.map((request): UserAttentionRequest => {
            const offers = offerRows.filter((offer) => offer.bookingRequestId === request.bookingRequestId);
            const accepted = offers.find((offer) => offer.userAccepted === true && offer.cookAccepted === true);
            return {
                bookingRequestId: request.bookingRequestId,
                status: bookingRequestStatusDerive({
                    offerCount: offers.length,
                    acceptedOfferPaymentStatus: accepted?.paymentStatus ?? null,
                    canceledAt: request.canceledAt,
                    expiresAt: request.expiresAt,
                    eventDate: request.dateTime,
                    now,
                }),
                occasion: request.occasion,
                dateTime: request.dateTime,
                offers: offers.map((offer) => {
                    const status = bookingRequestOfferStatusDerive({
                        userAccepted: offer.userAccepted ?? null,
                        cookAccepted: offer.cookAccepted ?? null,
                        userRequestedMenuAdjustments: offer.userRequestedMenuAdjustments ?? null,
                        paymentStatus: offer.paymentStatus,
                        paymentDataPresent: Boolean(offer.paymentData),
                        bookingRequestCanceledAt: request.canceledAt,
                        bookingRequestExpiresAt: request.expiresAt,
                        bookingRequestDateTime: request.dateTime,
                        hasAcceptedAlternative: accepted != null && accepted.bookingRequestOfferId !== offer.bookingRequestOfferId,
                        now,
                    });
                    return {
                        bookingRequestOfferId: offer.bookingRequestOfferId,
                        status,
                        userUnreadNotificationCount: offer.userUnreadNotificationCount,
                        testimonialMissing: status === 'COMPLETED' && !reviewedOfferIds.has(offer.bookingRequestOfferId),
                        callBookings: callRows.filter((call) => call.bookingRequestOfferId === offer.bookingRequestOfferId),
                    };
                }),
            };
        });

        return userAttentionDerive(attentionRequests);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
