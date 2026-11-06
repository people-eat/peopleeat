import { eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestKitchenDetailsUpdateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestKitchenDetailsPhotosReplace } from '../utils/bookingRequestKitchenDetailsPhotosReplace';
import {
    bookingRequestKitchenDetailsPhotoIdsAssert,
    bookingRequestKitchenDetailsPrepareForWrite,
} from '../utils/bookingRequestKitchenDetailsPrepareForWrite';
import { bookingRequestPoolCooksPublish } from '../utils/bookingRequestPoolCooksPublish';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';
import { userBookingRequestOwnedFindOne } from '../utils/userBookingRequestOwnedFindOne';

export async function userBookingRequestKitchenDetailsUpdate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestKitchenDetailsUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'userBookingRequestKitchenDetailsUpdate');

    const { bookingRequestId, kitchenDetails: kitchenDetailsArg, photoFileUploadIds } = args;

    try {
        const bookingRequest = await userBookingRequestOwnedFindOne(serverRuntime, userId, bookingRequestId);
        if (!bookingRequest) {
            throw new Error('userBookingRequestKitchenDetailsUpdate: booking request not found');
        }
        if (bookingRequest.canceledAt != null) {
            throw new Error('userBookingRequestKitchenDetailsUpdate: booking request is not updatable');
        }
        if (Date.now() > bookingRequest.dateTime.getTime()) {
            throw new Error('userBookingRequestKitchenDetailsUpdate: booking request is not updatable');
        }

        const nextKitchenDetails = await bookingRequestKitchenDetailsPrepareForWrite(
            kitchenDetailsArg ?? undefined,
            serverRuntime,
            userId,
            'update',
        );
        const nextPhotoFileUploadIds =
            photoFileUploadIds == null
                ? undefined
                : bookingRequestKitchenDetailsPhotoIdsAssert(photoFileUploadIds, 'userBookingRequestKitchenDetailsUpdate');

        if (nextKitchenDetails === undefined && nextPhotoFileUploadIds === undefined) {
            return { success: true, referenceId: bookingRequestId };
        }

        await serverRuntime.db.transaction(async (transaction) => {
            if (nextKitchenDetails !== undefined) {
                await transaction
                    .update(bookingRequests)
                    .set({ kitchenDetails: nextKitchenDetails })
                    .where(eq(bookingRequests.bookingRequestId, bookingRequestId));
            }
            if (nextPhotoFileUploadIds !== undefined) {
                await bookingRequestKitchenDetailsPhotosReplace(transaction, {
                    bookingRequestId,
                    userId,
                    fileUploadIds: nextPhotoFileUploadIds,
                    commandName: 'userBookingRequestKitchenDetailsUpdate',
                });
            }
        });

        await bookingRequestPoolCooksPublish(serverRuntime, [bookingRequest]);
        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
