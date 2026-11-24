import { eq } from 'drizzle-orm';

import { bookingRequestMarketClosedAssert } from '../../shared/expansionMarkets';
import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeSingleLine, textNormalizeTitled } from '../../shared/textNormalize';
import type { BookingRequestCreate, BookingRequestParticipantCreate } from '../db/schema';
import { bookingRequestParticipants, bookingRequests, cooks, users } from '../db/schema';
import type { BookingRequestExactEventAddress } from '../domain/bookingRequest';
import { LARGE_GROUP_PARTICIPANT_THRESHOLD } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationBookingRequestCreateArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyBookingRequestCreated } from '../slack/slackNotifyBooking';
import { applyDiscountToBookingRequest } from '../utils/applyDiscountToBookingRequest';
import { bookingRequestAdjustedMessageGenerateScheduleIfEnabled } from '../utils/bookingRequestAdjustedMessageGenerateSchedule';
import { bookingRequestCooksNotify } from '../utils/bookingRequestCooksNotify';
import { bookingRequestDirectCookResolve } from '../utils/bookingRequestDirectCookResolve';
import { bookingRequestDirectMenuResolve } from '../utils/bookingRequestDirectMenuResolve';
import { bookingRequestExpireNotifySchedule } from '../utils/bookingRequestExpireNotifySchedule';
import { bookingRequestExpiresAt } from '../utils/bookingRequestExpiresAt';
import { userBookingRequestCreateEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestNoOffersNotifySchedule } from '../utils/bookingRequestNoOffersNotifySchedule';
import { bookingRequestParticipantsPrepareForWrite } from '../utils/bookingRequestParticipantsPrepareForWrite';
import { bookingRequestPoolCooksPublish } from '../utils/bookingRequestPoolCooksPublish';
import { bookingRequestSettingPrepareForWrite } from '../utils/bookingRequestSettingPrepareForWrite';
import { cookIdsCanCreateOffersFind } from '../utils/cookIdsCanCreateOffersFind';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { sessionEventCreate } from '../utils/sessionEventCreate';

export async function userBookingRequestCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, requestingSession, serverRuntime);

    const input = args.input;
    const occasion = textNormalizeTitled(input.occasion);
    const originalMessage = textNormalizeProseTitled(input.originalMessage);
    const redeemCode = input.redeemCode?.trim() || null;
    const preferences = input.preferences
        .map((preference) => textNormalizeTitled(preference))
        .filter((preference) => preference.length > 0);

    if (occasion.length === 0) {
        throw new Error('userBookingRequestCreate: occasion must not be empty');
    }
    if (originalMessage.length === 0) {
        const optionalMessageEnabled = await featureToggleIsEnabled('BOOKING_REQUEST_OPTIONAL_MESSAGE', serverRuntime, userId);
        if (!optionalMessageEnabled) {
            throw new Error('userBookingRequestCreate: originalMessage must not be empty');
        }
    }

    const participants = await bookingRequestParticipantsPrepareForWrite(
        input.participants,
        serverRuntime,
        'userBookingRequestCreate',
        userId,
    );
    const setting = await bookingRequestSettingPrepareForWrite(input.setting, serverRuntime, userId, 'create');
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
        throw new Error('userBookingRequestCreate: exactEventAddress is incomplete');
    }
    bookingRequestMarketClosedAssert(exactEventAddress.country, 'userBookingRequestCreate');

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
        const requestedCook = await bookingRequestDirectCookResolve(serverRuntime, {
            requestedCookId: input.requestedCookId,
            customerUserId: userId,
        });
        const requestedMenu = requestedCook
            ? await bookingRequestDirectMenuResolve(serverRuntime, {
                  cookId: requestedCook.cookId,
                  requestedMenuId: input.requestedMenuId,
              })
            : null;
        const publicationStatus = requestedCook
            ? 'PUBLICATION_DIRECT_TO_COOK'
            : participants.length >= LARGE_GROUP_PARTICIPANT_THRESHOLD
              ? 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW'
              : 'PUBLICATION_AUTO_APPROVED';

        const bookingRequestInsert: BookingRequestCreate = {
            bookingRequestId,
            userId,
            occasion,
            dateTime: input.dateTime,
            exactEventAddress,
            originalMessage,
            preferences,
            priceClassType: input.priceClassType ?? null,
            publicationStatus,
            requestedCookId: requestedCook?.cookId ?? null,
            expiresAt: bookingRequestExpiresAt(input.dateTime),
            setting: setting ?? null,
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
        if (publicationStatus === 'PUBLICATION_DIRECT_TO_COOK' && requestedCook) {
            cooksNotifiedCount = 1;
            await bookingRequestCooksNotify(
                serverRuntime,
                [requestedCook.cookId],
                {
                    bookingRequestId,
                    occasion,
                    dateTime: input.dateTime,
                    city: exactEventAddress.city,
                    country: exactEventAddress.country,
                },
                { direct: true, requestedMenu },
            );
            await bookingRequestPoolCooksPublish(
                serverRuntime,
                [
                    {
                        bookingRequestId,
                        userId,
                        publicationStatus,
                        exactEventAddress,
                        requestedCookId: requestedCook.cookId,
                    },
                ],
                [requestedCook.cookId],
            );
        } else if (publicationStatus === 'PUBLICATION_AUTO_APPROVED') {
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
                country: exactEventAddress.country,
            });
            await bookingRequestPoolCooksPublish(
                serverRuntime,
                [{ bookingRequestId, userId, publicationStatus, exactEventAddress, requestedCookId: null }],
                cookIds,
            );
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

        await userBookingRequestCreateEmailSend(serverRuntime, { bookingRequestId, userId });
        await slackNotifyBookingRequestCreated(serverRuntime, {
            bookingRequestId,
            cooksNotifiedCount: publicationStatus === 'PUBLICATION_AUTO_APPROVED' ? cooksNotifiedCount : undefined,
        });

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'BOOKING_REQUEST_CREATED',
            payload: {
                bookingRequestId,
                ...(requestedCook ? { requestedCookId: requestedCook.cookId } : {}),
                ...(requestedMenu ? { requestedMenuId: requestedMenu.menuId } : {}),
            },
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
