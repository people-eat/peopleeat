import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeSingleLine, textNormalizeTitled } from '../../shared/textNormalize';
import type { BookingRequestCreate, BookingRequestParticipantCreate } from '../db/schema';
import { bookingRequestParticipants, bookingRequests, users } from '../db/schema';
import type { BookingRequestExactEventAddress } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationBookingRequestCreateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { LARGE_GROUP_PARTICIPANT_THRESHOLD } from '../slack/bookingRequestSlack';
import { slackNotifyBookingRequestCreated } from '../slack/slackNotifyBooking';
import { bookingRequestAdjustedMessageGenerateScheduleIfEnabled } from '../utils/bookingRequestAdjustedMessageGenerateSchedule';
import { bookingRequestCooksNotify } from '../utils/bookingRequestCooksNotify';
import { bookingRequestExpireNotifySchedule } from '../utils/bookingRequestExpireNotifySchedule';
import { bookingRequestExpiresAt } from '../utils/bookingRequestExpiresAt';
import { bookingRequestNoOffersNotifySchedule } from '../utils/bookingRequestNoOffersNotifySchedule';
import { bookingRequestParticipantsPrepareForWrite } from '../utils/bookingRequestParticipantsPrepareForWrite';
import { cookIdsCanCreateOffersFind } from '../utils/cookIdsCanCreateOffersFind';

export async function adminBookingRequestCreate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const input = args.input;
    const userId = input.userId.trim();
    const occasion = textNormalizeTitled(input.occasion);
    const originalMessage = textNormalizeProseTitled(input.originalMessage);
    const preferences = input.preferences
        .map((preference) => textNormalizeTitled(preference))
        .filter((preference) => preference.length > 0);

    if (userId.length === 0) {
        throw new Error('adminBookingRequestCreate: userId must not be empty');
    }
    if (occasion.length === 0) {
        throw new Error('adminBookingRequestCreate: occasion must not be empty');
    }
    if (originalMessage.length === 0) {
        throw new Error('adminBookingRequestCreate: originalMessage must not be empty');
    }

    const participants = await bookingRequestParticipantsPrepareForWrite(
        input.participants,
        serverRuntime,
        'adminBookingRequestCreate',
        userId,
    );
    const exactEventAddress: BookingRequestExactEventAddress = {
        displayText: textNormalizeSingleLine(input.exactEventAddress.displayText),
        latitude: input.exactEventAddress.latitude,
        longitude: input.exactEventAddress.longitude,
        addressLine1: textNormalizeSingleLine(input.exactEventAddress.addressLine1),
        addressLine2: textNormalizeSingleLine(input.exactEventAddress.addressLine2),
        city: textNormalizeTitled(input.exactEventAddress.city),
        postCode: textNormalizeSingleLine(input.exactEventAddress.postCode),
        state: textNormalizeSingleLine(input.exactEventAddress.state),
        country: textNormalizeSingleLine(input.exactEventAddress.country),
    };

    if (exactEventAddress.displayText.length === 0 || exactEventAddress.city.length === 0) {
        throw new Error('adminBookingRequestCreate: exactEventAddress is incomplete');
    }

    const requestedCookIds = input.cookIds.map((cookId) => cookId.trim()).filter((cookId) => cookId.length > 0);

    try {
        const [user] = await serverRuntime.db.select().from(users).where(eq(users.userId, userId)).limit(1);
        if (!user) {
            throw new Error('adminBookingRequestCreate: user not found');
        }

        const bookingRequestId = idCreate();
        const publicationStatus =
            participants.length >= LARGE_GROUP_PARTICIPANT_THRESHOLD ? 'PUBLICATION_APPROVED_BY_ADMIN' : 'PUBLICATION_AUTO_APPROVED';

        const bookingRequestInsert: BookingRequestCreate = {
            bookingRequestId,
            userId,
            occasion,
            dateTime: input.dateTime,
            exactEventAddress,
            originalMessage,
            preferences,
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

        const cookIdsInRadius = await cookIdsCanCreateOffersFind(
            serverRuntime,
            { latitude: exactEventAddress.latitude, longitude: exactEventAddress.longitude },
            { excludeUserId: userId },
        );
        const cookIdsToNotify = requestedCookIds.filter((cookId) => cookIdsInRadius.includes(cookId));

        if (cookIdsToNotify.length > 0) {
            await bookingRequestCooksNotify(serverRuntime, cookIdsToNotify, {
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
        await bookingRequestAdjustedMessageGenerateScheduleIfEnabled(serverRuntime, {
            bookingRequestId,
            userId,
            originalMessage,
        });

        await slackNotifyBookingRequestCreated(serverRuntime, {
            bookingRequestId,
            cooksNotifiedCount: cookIdsToNotify.length > 0 ? cookIdsToNotify.length : undefined,
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
