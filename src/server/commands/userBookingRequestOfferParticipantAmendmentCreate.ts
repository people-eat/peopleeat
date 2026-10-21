import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks, users } from '../db/schema';
import type { BookingRequestOfferParticipantAmendment } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferParticipantAmendmentCreateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferParticipantAmendmentCreateEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferCanRequestParticipantAmendment } from '../utils/bookingRequestOfferParticipantAmendmentGates';
import { bookingRequestOfferParticipantAmendmentPriceCalculate } from '../utils/bookingRequestOfferParticipantAmendmentPrice';
import { bookingRequestParticipantsPrepareForWrite } from '../utils/bookingRequestParticipantsPrepareForWrite';
import { emailAddressPresent } from '../utils/emailAddressPresent';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function userBookingRequestOfferParticipantAmendmentCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferParticipantAmendmentCreateArgs,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { bookingRequestOfferId } = args;

    try {
        const enabled = await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT', serverRuntime, userId);
        if (!enabled) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCreate: feature is disabled');
        }

        const participants = await bookingRequestParticipantsPrepareForWrite(
            args.participants,
            serverRuntime,
            'userBookingRequestOfferParticipantAmendmentCreate',
            userId,
        );

        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
                cook: cooks,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .where(and(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCreate: offer not found');
        }

        if (
            !bookingRequestOfferCanRequestParticipantAmendment({
                offer: row.offer,
                bookingRequest: row.bookingRequest,
            })
        ) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCreate: amendment is not allowed');
        }

        const existingParticipants = await serverRuntime.db
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, row.bookingRequest.bookingRequestId));

        const adultsBefore = existingParticipants.filter((p) => p.type === 'ADULT').length;
        const discountedBefore = existingParticipants.filter((p) => p.type === 'DISCOUNTED').length;
        const adultsAfter = participants.filter((p) => p.type === 'ADULT').length;
        const discountedAfter = participants.filter((p) => p.type === 'DISCOUNTED').length;

        if (adultsBefore === adultsAfter && discountedBefore === discountedAfter) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCreate: participant counts unchanged');
        }

        const totalCentsCustomerBefore = row.offer.totalCentsCustomer ?? row.offer.totalWithoutDiscountsCentsCustomer;
        const pricePreview = bookingRequestOfferParticipantAmendmentPriceCalculate(
            {
                menuPriceCentsBefore: row.offer.menuPriceCents,
                travelExpensesCents: row.offer.travelExpensesCents,
                totalWithoutDiscountsCentsCustomerBefore: row.offer.totalWithoutDiscountsCentsCustomer,
                totalCentsCustomerBefore,
                participantsBefore: existingParticipants,
                participantsAfter: participants,
            },
            row.offer.payoutCentsCook,
        );

        const amendment: BookingRequestOfferParticipantAmendment = {
            requestedAt: new Date().toISOString(),
            participants: participants.map((participant) => ({
                type: participant.type,
                name: participant.name,
                restrictions: participant.restrictions,
            })),
            menuPriceCentsBefore: row.offer.menuPriceCents,
            totalCentsCustomerBefore,
            payoutCentsCookBefore: row.offer.payoutCentsCook,
        };

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    participantAmendment: amendment,
                    cookUnreadNotificationCount: row.offer.cookUnreadNotificationCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'USER_PARTICIPANT_AMENDMENT_REQUESTED',
                payload: {
                    participantsAdultBefore: adultsBefore,
                    participantsDiscountedBefore: discountedBefore,
                    participantsAdultAfter: adultsAfter,
                    participantsDiscountedAfter: discountedAfter,
                    menuPriceCentsBefore: row.offer.menuPriceCents,
                    menuPriceCentsAfter: pricePreview.menuPriceCentsAfter,
                    totalCentsCustomerBefore,
                    totalCentsCustomerAfter: pricePreview.totalCentsCustomerAfter,
                    payoutCentsCookBefore: row.offer.payoutCentsCook,
                    payoutCentsCookAfter: pricePreview.payoutCentsCookAfter,
                },
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.userUpdates({ userId: row.cook.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        const [[customerRow], [cookRow]] = await Promise.all([
            serverRuntime.db.select().from(users).where(eq(users.userId, userId)).limit(1),
            serverRuntime.db.select().from(users).where(eq(users.userId, row.cook.cookId)).limit(1),
        ]);
        const customer = customerRow ? emailAddressPresent(customerRow) : null;
        const cook = cookRow ? emailAddressPresent(cookRow) : null;

        if (customer && cook) {
            await bookingRequestOfferParticipantAmendmentCreateEmailSend(serverRuntime, {
                bookingRequest: row.bookingRequest,
                offer: row.offer,
                customer,
                cook,
            });
        }

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error);
        return { success: false };
    }
}
