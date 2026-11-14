import { and, eq } from 'drizzle-orm';

import { bookingRequestCooks, bookingRequestOffers, bookingRequestParticipants, bookingRequests } from '../db/schema';
import { bookingRequestIsExclusive, LARGE_GROUP_PARTICIPANT_THRESHOLD } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOpenToOtherCooksArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestCooksNotify } from '../utils/bookingRequestCooksNotify';
import { bookingRequestPoolCooksPublish } from '../utils/bookingRequestPoolCooksPublish';
import { cookIdsCanCreateOffersFind } from '../utils/cookIdsCanCreateOffersFind';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function userBookingRequestOpenToOtherCooks(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOpenToOtherCooksArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, requestingSession, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'userBookingRequestOpenToOtherCooks');

    const bookingRequestId = args.bookingRequestId.trim();
    if (bookingRequestId.length === 0) {
        throw new Error('userBookingRequestOpenToOtherCooks: bookingRequestId must not be empty');
    }

    try {
        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(and(eq(bookingRequests.bookingRequestId, bookingRequestId), eq(bookingRequests.userId, userId)))
            .limit(1);

        if (!bookingRequest) {
            throw new Error('userBookingRequestOpenToOtherCooks: booking request not found');
        }

        if (!bookingRequestIsExclusive(bookingRequest.publicationStatus)) {
            return { success: true, referenceId: bookingRequestId };
        }

        if (bookingRequest.canceledAt) {
            throw new Error('userBookingRequestOpenToOtherCooks: booking request is canceled');
        }

        if (bookingRequest.expiresAt && bookingRequest.expiresAt.getTime() < Date.now()) {
            throw new Error('userBookingRequestOpenToOtherCooks: booking request is expired');
        }

        const [acceptedOffer] = await serverRuntime.db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .where(
                and(
                    eq(bookingRequestOffers.bookingRequestId, bookingRequestId),
                    eq(bookingRequestOffers.userAccepted, true),
                    eq(bookingRequestOffers.cookAccepted, true),
                ),
            )
            .limit(1);
        if (acceptedOffer) {
            throw new Error('userBookingRequestOpenToOtherCooks: booking request already has an accepted offer');
        }

        const participantRows = await serverRuntime.db
            .select({ bookingRequestParticipantId: bookingRequestParticipants.bookingRequestParticipantId })
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequestId));
        const isLargeGroup = participantRows.length >= LARGE_GROUP_PARTICIPANT_THRESHOLD;
        const nextPublicationStatus = isLargeGroup
            ? ('PUBLICATION_BLOCKED_BY_ADMIN_REVIEW' as const)
            : ('PUBLICATION_AUTO_APPROVED' as const);

        await serverRuntime.db
            .update(bookingRequests)
            .set({ publicationStatus: nextPublicationStatus })
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId));

        const updated = { ...bookingRequest, publicationStatus: nextPublicationStatus };

        if (!isLargeGroup) {
            const radiusCookIds = await cookIdsCanCreateOffersFind(
                serverRuntime,
                {
                    latitude: bookingRequest.exactEventAddress.latitude,
                    longitude: bookingRequest.exactEventAddress.longitude,
                },
                { excludeUserId: userId },
            );
            const affinityRows = await serverRuntime.db
                .select({
                    cookId: bookingRequestCooks.cookId,
                    notifiedAt: bookingRequestCooks.notifiedAt,
                    declinedAt: bookingRequestCooks.declinedAt,
                })
                .from(bookingRequestCooks)
                .where(eq(bookingRequestCooks.bookingRequestId, bookingRequestId));
            const skipIds = new Set(
                affinityRows.filter((row) => row.notifiedAt != null || row.declinedAt != null).map((row) => row.cookId),
            );
            const cookIdsToNotify = radiusCookIds.filter((cookId) => !skipIds.has(cookId));
            await bookingRequestCooksNotify(serverRuntime, cookIdsToNotify, {
                bookingRequestId,
                occasion: bookingRequest.occasion,
                dateTime: bookingRequest.dateTime,
                city: bookingRequest.exactEventAddress.city,
                country: bookingRequest.exactEventAddress.country,
            });
        }

        await bookingRequestPoolCooksPublish(serverRuntime, [updated]);

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'BOOKING_REQUEST_OPENED_TO_OTHER_COOKS',
            payload: { bookingRequestId },
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
