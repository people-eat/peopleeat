import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { userDisplayName } from '../../shared';
import {
    bookingRequestOfferCallRecordings,
    bookingRequestOfferCallRooms,
    bookingRequestOffers,
    bookingRequests,
    fileUploads,
    users,
} from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCall, GqlSAdminCallArgs, GqlSSession } from '../graphql/generated';
import { toGqlBookingRequestOfferCallRecording } from '../mappers/toGqlBookingRequestOfferCallRecording';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';

export async function adminCallFindOne(
    args: GqlSAdminCallArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCall | null> {
    try {
        const cookUsers = alias(users, 'cookUsers');
        const customerUsers = alias(users, 'customerUsers');
        const cookProfilePictures = alias(fileUploads, 'cookProfilePictures');
        const customerProfilePictures = alias(fileUploads, 'customerProfilePictures');

        const [row] = await serverRuntime.db
            .select({
                room: bookingRequestOfferCallRooms,
                recording: bookingRequestOfferCallRecordings,
                bookingRequestId: bookingRequests.bookingRequestId,
                bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                cookId: bookingRequestOffers.cookId,
                customerUserId: bookingRequests.userId,
                cookFirstName: cookUsers.firstName,
                cookLastName: cookUsers.lastName,
                cookEmailAddress: cookUsers.emailAddress,
                customerFirstName: customerUsers.firstName,
                customerLastName: customerUsers.lastName,
                customerEmailAddress: customerUsers.emailAddress,
                cookProfilePicture: {
                    fileUploadId: cookProfilePictures.fileUploadId,
                    filename: cookProfilePictures.filename,
                    mediaType: cookProfilePictures.mediaType,
                    size: cookProfilePictures.size,
                },
                customerProfilePicture: {
                    fileUploadId: customerProfilePictures.fileUploadId,
                    filename: customerProfilePictures.filename,
                    mediaType: customerProfilePictures.mediaType,
                    size: customerProfilePictures.size,
                },
                occasion: bookingRequests.occasion,
            })
            .from(bookingRequestOfferCallRooms)
            .innerJoin(
                bookingRequestOffers,
                eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferCallRooms.bookingRequestOfferId),
            )
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cookUsers, eq(cookUsers.userId, bookingRequestOffers.cookId))
            .innerJoin(customerUsers, eq(customerUsers.userId, bookingRequests.userId))
            .leftJoin(cookProfilePictures, eq(cookProfilePictures.fileUploadId, cookUsers.profilePictureFileUploadId))
            .leftJoin(customerProfilePictures, eq(customerProfilePictures.fileUploadId, customerUsers.profilePictureFileUploadId))
            .leftJoin(
                bookingRequestOfferCallRecordings,
                eq(
                    bookingRequestOfferCallRecordings.bookingRequestOfferCallRoomId,
                    bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId,
                ),
            )
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, args.bookingRequestOfferCallRoomId))
            .limit(1);

        if (!row) {
            return null;
        }

        const cookDisplayName = userDisplayName({ firstName: row.cookFirstName, lastName: row.cookLastName });
        const customerDisplayName = userDisplayName({
            firstName: row.customerFirstName,
            lastName: row.customerLastName,
        });
        const cookProfilePicture = row.cookProfilePicture?.fileUploadId ? toGqlFileUpload(row.cookProfilePicture) : null;
        const customerProfilePicture = row.customerProfilePicture?.fileUploadId ? toGqlFileUpload(row.customerProfilePicture) : null;

        return {
            bookingRequestOfferCallRoomId: row.room.bookingRequestOfferCallRoomId,
            bookingRequestOfferId: row.bookingRequestOfferId,
            bookingRequestId: row.bookingRequestId,
            livekitRoomName: row.room.livekitRoomName,
            status: row.room.status,
            startedAt: row.room.startedAt,
            endedAt: row.room.endedAt ?? null,
            occasion: row.occasion,
            cookId: row.cookId,
            customerUserId: row.customerUserId,
            cookDisplayName,
            customerDisplayName,
            cook: {
                userId: row.cookId,
                displayName: cookDisplayName,
                emailAddress: row.cookEmailAddress,
                profilePicture: cookProfilePicture,
            },
            customer: {
                userId: row.customerUserId,
                displayName: customerDisplayName,
                emailAddress: row.customerEmailAddress,
                profilePicture: customerProfilePicture,
            },
            recording: row.recording ? toGqlBookingRequestOfferCallRecording(row.recording) : null,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
