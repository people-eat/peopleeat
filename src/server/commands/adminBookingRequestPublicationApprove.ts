import { eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestPublicationApproveArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyBookingRequestPublicationApproved } from '../slack/slackNotifyBooking';
import { bookingRequestCooksNotify } from '../utils/bookingRequestCooksNotify';
import { cookIdsCanCreateOffersFind } from '../utils/cookIdsCanCreateOffersFind';

export async function adminBookingRequestPublicationApprove(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestPublicationApproveArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestId = args.bookingRequestId.trim();
    if (bookingRequestId.length === 0) {
        throw new Error('adminBookingRequestPublicationApprove: bookingRequestId must not be empty');
    }

    try {
        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId))
            .limit(1);

        if (!bookingRequest) {
            throw new Error('adminBookingRequestPublicationApprove: booking request not found');
        }

        if (bookingRequest.publicationStatus !== 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW') {
            throw new Error('adminBookingRequestPublicationApprove: booking request is not blocked for review');
        }

        if (bookingRequest.canceledAt) {
            throw new Error('adminBookingRequestPublicationApprove: booking request is canceled');
        }

        if (bookingRequest.expiresAt && bookingRequest.expiresAt.getTime() < Date.now()) {
            throw new Error('adminBookingRequestPublicationApprove: booking request is expired');
        }

        const eventLocation = {
            latitude: bookingRequest.exactEventAddress.latitude,
            longitude: bookingRequest.exactEventAddress.longitude,
        };

        const cookIdsInRadius = await cookIdsCanCreateOffersFind(serverRuntime, eventLocation, {
            excludeUserId: bookingRequest.userId,
        });

        const requestedCookIds = (args.cookIds ?? []).map((cookId) => cookId.trim()).filter((cookId) => cookId.length > 0);
        const cookIdsToNotify =
            requestedCookIds.length > 0 ? requestedCookIds.filter((cookId) => cookIdsInRadius.includes(cookId)) : cookIdsInRadius;

        await serverRuntime.db
            .update(bookingRequests)
            .set({ publicationStatus: 'PUBLICATION_APPROVED_BY_ADMIN' })
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId));

        await bookingRequestCooksNotify(serverRuntime, cookIdsToNotify, {
            bookingRequestId,
            occasion: bookingRequest.occasion,
            dateTime: bookingRequest.dateTime,
            city: bookingRequest.exactEventAddress.city,
        });

        await slackNotifyBookingRequestPublicationApproved(serverRuntime, {
            bookingRequestId,
            cooksNotifiedCount: cookIdsToNotify.length,
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId: bookingRequest.userId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
