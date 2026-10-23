import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferAmendmentCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferParticipantAmendmentCreateEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferAdminAmendmentPrepare } from '../utils/bookingRequestOfferAdminAmendmentPrepare';
import { emailAddressPresent } from '../utils/emailAddressPresent';

/**
 * Admin proposes a post–dual-accept booking change (venue / participants / menu /
 * travel). Cook must accept. No feature toggle.
 */
export async function adminBookingRequestOfferAmendmentCreate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferAmendmentCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestOfferId = args.bookingRequestOfferId.trim();
    if (bookingRequestOfferId.length === 0) {
        throw new Error('adminBookingRequestOfferAmendmentCreate: bookingRequestOfferId must not be empty');
    }

    try {
        const prepared = await bookingRequestOfferAdminAmendmentPrepare(serverRuntime, {
            bookingRequestOfferId,
            participants: args.input.participants,
            exactEventAddress: args.input.exactEventAddress,
            menuPriceCents: args.input.menuPriceCents,
            travelExpensesCents: args.input.travelExpensesCents,
            travelDistanceKm: args.input.travelDistanceKm,
            errorPrefix: 'adminBookingRequestOfferAmendmentCreate',
        });

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    participantAmendment: prepared.amendment,
                    cookUnreadNotificationCount: prepared.offer.cookUnreadNotificationCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'ADMIN_PARTICIPANT_AMENDMENT_REQUESTED',
                payload: {
                    participantsAdultBefore: prepared.adultsBefore,
                    participantsDiscountedBefore: prepared.discountedBefore,
                    participantsAdultAfter: prepared.adultsAfter,
                    participantsDiscountedAfter: prepared.discountedAfter,
                    ...(prepared.nextAddress
                        ? {
                              locationBefore: prepared.bookingRequest.exactEventAddress,
                              locationAfter: prepared.nextAddress,
                          }
                        : {}),
                    menuPriceCentsBefore: prepared.offer.menuPriceCents,
                    menuPriceCentsAfter: prepared.pricePreview.menuPriceCentsAfter,
                    travelExpensesCentsBefore: prepared.offer.travelExpensesCents,
                    travelExpensesCentsAfter: prepared.pricePreview.travelExpensesCents,
                    totalCentsCustomerBefore: prepared.amendment.totalCentsCustomerBefore,
                    totalCentsCustomerAfter: prepared.pricePreview.totalCentsCustomerAfter,
                    payoutCentsCookBefore: prepared.offer.payoutCentsCook,
                    payoutCentsCookAfter: prepared.pricePreview.payoutCentsCookAfter,
                    giftCardDeltaCents: prepared.pricePreview.giftCardDeltaCents,
                },
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: prepared.customer.userId }),
            serverRuntime.publish.userUpdates({ userId: prepared.cook.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        const [cookRow] = await serverRuntime.db.select().from(users).where(eq(users.userId, prepared.cook.cookId)).limit(1);
        const customer = emailAddressPresent(prepared.customer);
        const cook = cookRow ? emailAddressPresent(cookRow) : null;
        if (customer && cook) {
            await bookingRequestOfferParticipantAmendmentCreateEmailSend(serverRuntime, {
                bookingRequest: prepared.bookingRequest,
                offer: prepared.offer,
                customer,
                cook,
            });
        }

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
