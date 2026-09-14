import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { BookingRequestCreate, BookingRequestParticipantCreate } from '../db/schema';
import { bookingRequestParticipants, bookingRequests, cooks, users } from '../db/schema';
import type { BookingRequestExactEventAddress } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationBookingRequestCreateArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyBookingRequestCreated } from '../slack/slackNotifyBooking';
import { applyDiscountToBookingRequest } from '../utils/applyDiscountToBookingRequest';
import { bookingRequestCooksNotify } from '../utils/bookingRequestCooksNotify';
import { bookingRequestExpireNotifySchedule } from '../utils/bookingRequestExpireNotifySchedule';
import { bookingRequestExpiresAt } from '../utils/bookingRequestExpiresAt';
import { userBookingRequestCreateEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestNoOffersNotifySchedule } from '../utils/bookingRequestNoOffersNotifySchedule';
import { bookingRequestParticipantsPrepareForWrite } from '../utils/bookingRequestParticipantsPrepareForWrite';
import { cookIdsCanCreateOffersFind } from '../utils/cookIdsCanCreateOffersFind';
import { sessionEventCreate } from '../utils/sessionEventCreate';

const LARGE_GROUP_PARTICIPANT_THRESHOLD = 12;

export async function userBookingRequestCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const input = args.input;
    const occasion = input.occasion.trim();
    const originalMessage = input.originalMessage.trim();
    const redeemCode = input.redeemCode?.trim() || null;

    if (occasion.length === 0) {
        throw new Error('userBookingRequestCreate: occasion must not be empty');
    }
    if (originalMessage.length === 0) {
        throw new Error('userBookingRequestCreate: originalMessage must not be empty');
    }

    const participants = await bookingRequestParticipantsPrepareForWrite(
        input.participants,
        serverRuntime,
        'userBookingRequestCreate',
        userId,
    );
    const exactEventAddress: BookingRequestExactEventAddress = {
        displayText: input.exactEventAddress.displayText.trim(),
        latitude: input.exactEventAddress.latitude,
        longitude: input.exactEventAddress.longitude,
        addressLine1: input.exactEventAddress.addressLine1.trim(),
        addressLine2: input.exactEventAddress.addressLine2.trim(),
        city: input.exactEventAddress.city.trim(),
        postCode: input.exactEventAddress.postCode.trim(),
        state: input.exactEventAddress.state.trim(),
        country: input.exactEventAddress.country.trim(),
    };

    if (exactEventAddress.displayText.length === 0 || exactEventAddress.city.length === 0) {
        throw new Error('userBookingRequestCreate: exactEventAddress is incomplete');
    }

    try {
        const [user] = await serverRuntime.db.select().from(users).where(eq(users.userId, userId)).limit(1);
        if (!user) {
            throw new Error('userBookingRequestCreate: user not found');
        }
        if (user.status !== 'ACTIVE') {
            throw new Error('userBookingRequestCreate: user is not active');
        }

        const [cook] = await serverRuntime.db.select({ cookId: cooks.cookId }).from(cooks).where(eq(cooks.cookId, userId)).limit(1);
        if (cook) {
            throw new Error('userBookingRequestCreate: cooks cannot create booking requests');
        }

        const bookingRequestId = idCreate();
        const publicationStatus =
            participants.length >= LARGE_GROUP_PARTICIPANT_THRESHOLD ? 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW' : 'PUBLICATION_AUTO_APPROVED';

        const bookingRequestInsert: BookingRequestCreate = {
            bookingRequestId,
            userId,
            occasion,
            dateTime: input.dateTime,
            exactEventAddress,
            originalMessage,
            preferences: input.preferences,
            priceClassType: input.priceClassType,
            publicationStatus,
            expiresAt: bookingRequestExpiresAt(input.dateTime),
        };

        const participantInserts: BookingRequestParticipantCreate[] = participants.map((participant) => ({
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: participant.type,
            name: participant.name,
            restrictions: participant.restrictions,
        }));

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(bookingRequests).values(bookingRequestInsert);
            await transaction.insert(bookingRequestParticipants).values(participantInserts);
        });

        if (redeemCode) {
            const applied = await applyDiscountToBookingRequest(serverRuntime, userId, bookingRequestId, redeemCode);
            if (!applied) {
                await serverRuntime.db.delete(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
                throw new Error('userBookingRequestCreate: redeemCode is invalid or expired');
            }
        }

        let cooksNotifiedCount = 0;
        if (publicationStatus === 'PUBLICATION_AUTO_APPROVED') {
            const cookIds = await cookIdsCanCreateOffersFind(
                serverRuntime,
                { latitude: exactEventAddress.latitude, longitude: exactEventAddress.longitude },
                { excludeUserId: userId },
            );
            cooksNotifiedCount = cookIds.length;
            await bookingRequestCooksNotify(serverRuntime, cookIds, {
                bookingRequestId,
                occasion,
                dateTime: input.dateTime,
                city: exactEventAddress.city,
            });
        }

        await bookingRequestExpireNotifySchedule(serverRuntime, {
            bookingRequestId,
            expiresAt: bookingRequestInsert.expiresAt ?? null,
        });
        await bookingRequestNoOffersNotifySchedule(serverRuntime, {
            bookingRequestId,
            createdAt: new Date(),
        });

        await userBookingRequestCreateEmailSend(serverRuntime, { bookingRequestId, userId });
        await slackNotifyBookingRequestCreated(serverRuntime, {
            bookingRequestId,
            cooksNotifiedCount: publicationStatus === 'PUBLICATION_AUTO_APPROVED' ? cooksNotifiedCount : undefined,
        });

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'BOOKING_REQUEST_CREATED',
            payload: { bookingRequestId },
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
