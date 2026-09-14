import { eq } from 'drizzle-orm';

import { containsPhoneNumber } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEventAttachments, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequestOfferEventAttachmentCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferChatMessageCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { bookingRequestOfferChatWritableAssert } from '../utils/bookingRequestOfferChatWritableAssert';
import { fileUploadIdsAssertOwned } from '../utils/fileUploadIdsAssertOwned';

export async function adminBookingRequestOfferChatMessageCreate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferChatMessageCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const message = args.message.trim();
    const requestedFileUploadIds = Array.from(new Set(args.fileUploadIds ?? []));
    if (message.length === 0 && requestedFileUploadIds.length === 0) {
        throw new Error('adminBookingRequestOfferChatMessageCreate: message must not be empty');
    }
    if (message.length > 0 && containsPhoneNumber(message)) {
        throw new Error('adminBookingRequestOfferChatMessageCreate: phone numbers are not allowed');
    }

    const { bookingRequestOfferId } = args;
    const bookingRequestOfferEventId = idCreate();

    try {
        const fileUploadIds = await fileUploadIdsAssertOwned(serverRuntime.db, {
            userId: adminId,
            fileUploadIds: requestedFileUploadIds,
            commandName: 'adminBookingRequestOfferChatMessageCreate',
        });

        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!row) {
            throw new Error('adminBookingRequestOfferChatMessageCreate: offer not found');
        }

        bookingRequestOfferChatWritableAssert({ offer: row.offer, bookingRequest: row.bookingRequest });

        const attachmentJoins: BookingRequestOfferEventAttachmentCreate[] = fileUploadIds.map((fileUploadId, position) => ({
            bookingRequestOfferEventId,
            fileUploadId,
            position,
        }));

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1,
                    cookUnreadNotificationCount: row.offer.cookUnreadNotificationCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId,
                bookingRequestOfferId,
                type: 'ADMIN_MESSAGE_SIMPLE',
                payload: { messageBody: message },
            });

            if (attachmentJoins.length > 0) {
                await transaction.insert(bookingRequestOfferEventAttachments).values(attachmentJoins);
            }
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferEventId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
