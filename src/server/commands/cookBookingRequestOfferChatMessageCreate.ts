import { and, eq } from 'drizzle-orm';

import { containsPhoneNumber } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEventAttachments, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequestOfferEventAttachmentCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferChatMessageCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferChatMessageNotifySchedule } from '../utils/bookingRequestOfferChatMessageNotifySchedule';
import { bookingRequestOfferChatWritableAssert } from '../utils/bookingRequestOfferChatWritableAssert';
import { fileUploadIdsAssertOwned } from '../utils/fileUploadIdsAssertOwned';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function cookBookingRequestOfferChatMessageCreate(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferChatMessageCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferChatMessageCreate');

    const message = args.message.trim();
    const requestedFileUploadIds = Array.from(new Set(args.fileUploadIds ?? []));
    if (message.length === 0 && requestedFileUploadIds.length === 0) {
        throw new Error('cookBookingRequestOfferChatMessageCreate: message must not be empty');
    }
    if (message.length > 0 && containsPhoneNumber(message)) {
        throw new Error('cookBookingRequestOfferChatMessageCreate: phone numbers are not allowed');
    }

    const { bookingRequestOfferId } = args;
    const bookingRequestOfferEventId = idCreate();

    try {
        const fileUploadIds = await fileUploadIdsAssertOwned(serverRuntime.db, {
            userId: cookId,
            fileUploadIds: requestedFileUploadIds,
            commandName: 'cookBookingRequestOfferChatMessageCreate',
        });

        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferChatMessageCreate: offer not found');
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
                    adminChatReviewPendingCount: row.offer.adminChatReviewPendingCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId,
                bookingRequestOfferId,
                type: 'COOK_MESSAGE_SIMPLE',
                payload: { messageBody: message },
            });

            if (attachmentJoins.length > 0) {
                await transaction.insert(bookingRequestOfferEventAttachments).values(attachmentJoins);
            }
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
        ]);
        await bookingRequestOfferChatMessageNotifySchedule(serverRuntime, {
            bookingRequestOfferId,
            audience: 'CUSTOMER',
            existingJobId: row.offer.customerChatMessageNotifyJobId,
        });

        return { success: true, referenceId: bookingRequestOfferEventId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
