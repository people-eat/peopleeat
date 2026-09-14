import { and, eq } from 'drizzle-orm';

import { containsPhoneNumber } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEventAttachments, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequestOfferEventAttachmentCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferChatMessageCreateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferChatMessageNotifySchedule } from '../utils/bookingRequestOfferChatMessageNotifySchedule';
import { bookingRequestOfferChatWritableAssert } from '../utils/bookingRequestOfferChatWritableAssert';
import { bookingRequestReactionReminderCancel } from '../utils/bookingRequestReactionReminderSchedule';
import { fileUploadIdsAssertOwned } from '../utils/fileUploadIdsAssertOwned';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function userBookingRequestOfferChatMessageCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferChatMessageCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'userBookingRequestOfferChatMessageCreate');

    const message = args.message.trim();
    const requestedFileUploadIds = Array.from(new Set(args.fileUploadIds ?? []));
    if (message.length === 0 && requestedFileUploadIds.length === 0) {
        throw new Error('userBookingRequestOfferChatMessageCreate: message must not be empty');
    }
    if (message.length > 0 && containsPhoneNumber(message)) {
        throw new Error('userBookingRequestOfferChatMessageCreate: phone numbers are not allowed');
    }

    const { bookingRequestOfferId } = args;
    const bookingRequestOfferEventId = idCreate();

    try {
        const fileUploadIds = await fileUploadIdsAssertOwned(serverRuntime.db, {
            userId,
            fileUploadIds: requestedFileUploadIds,
            commandName: 'userBookingRequestOfferChatMessageCreate',
        });

        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferChatMessageCreate: offer not found');
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
                    cookUnreadNotificationCount: row.offer.cookUnreadNotificationCount + 1,
                    adminChatReviewPendingCount: row.offer.adminChatReviewPendingCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId,
                bookingRequestOfferId,
                type: 'USER_MESSAGE_SIMPLE',
                payload: { messageBody: message },
            });

            if (attachmentJoins.length > 0) {
                await transaction.insert(bookingRequestOfferEventAttachments).values(attachmentJoins);
            }
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);
        await bookingRequestOfferChatMessageNotifySchedule(serverRuntime, {
            bookingRequestOfferId,
            audience: 'COOK',
            existingJobId: row.offer.cookChatMessageNotifyJobId,
        });
        await bookingRequestReactionReminderCancel(serverRuntime, row.bookingRequest.bookingRequestId);

        return { success: true, referenceId: bookingRequestOfferEventId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
