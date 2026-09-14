import { eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestCooksNotifyArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestCooksNotify } from '../utils/bookingRequestCooksNotify';
import { cookIdsCanCreateOffersFind } from '../utils/cookIdsCanCreateOffersFind';

/**
 * Admin selective notify / re-notify for an already-published booking request.
 * Reuses `bookingRequestCooksNotify` (stamp + SSE + email; COALESCE keeps first notifiedAt).
 */
export async function adminBookingRequestCooksNotify(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestCooksNotifyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestId = args.bookingRequestId.trim();
    if (bookingRequestId.length === 0) {
        throw new Error('adminBookingRequestCooksNotify: bookingRequestId must not be empty');
    }

    const requestedCookIds = args.cookIds.map((cookId) => cookId.trim()).filter((cookId) => cookId.length > 0);
    if (requestedCookIds.length === 0) {
        throw new Error('adminBookingRequestCooksNotify: cookIds must not be empty');
    }

    try {
        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId))
            .limit(1);

        if (!bookingRequest) {
            throw new Error('adminBookingRequestCooksNotify: booking request not found');
        }

        if (
            bookingRequest.publicationStatus !== 'PUBLICATION_AUTO_APPROVED' &&
            bookingRequest.publicationStatus !== 'PUBLICATION_APPROVED_BY_ADMIN'
        ) {
            throw new Error('adminBookingRequestCooksNotify: booking request is not published');
        }

        if (bookingRequest.canceledAt) {
            throw new Error('adminBookingRequestCooksNotify: booking request is canceled');
        }

        if (bookingRequest.expiresAt && bookingRequest.expiresAt.getTime() < Date.now()) {
            throw new Error('adminBookingRequestCooksNotify: booking request is expired');
        }

        const cookIdsInRadius = await cookIdsCanCreateOffersFind(
            serverRuntime,
            {
                latitude: bookingRequest.exactEventAddress.latitude,
                longitude: bookingRequest.exactEventAddress.longitude,
            },
            { excludeUserId: bookingRequest.userId },
        );

        const cookIdsToNotify = requestedCookIds.filter((cookId) => cookIdsInRadius.includes(cookId));
        if (cookIdsToNotify.length === 0) {
            throw new Error('adminBookingRequestCooksNotify: no eligible cooks to notify');
        }

        await bookingRequestCooksNotify(serverRuntime, cookIdsToNotify, {
            bookingRequestId,
            occasion: bookingRequest.occasion,
            dateTime: bookingRequest.dateTime,
            city: bookingRequest.exactEventAddress.city,
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId: bookingRequest.userId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
