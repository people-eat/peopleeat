import { eq } from 'drizzle-orm';

import { bookingRequestOffers, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferAmendmentApplyArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferParticipantAmendmentAcceptEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferAdminAmendmentPrepare } from '../utils/bookingRequestOfferAdminAmendmentPrepare';
import { bookingRequestOfferParticipantAmendmentApply } from '../utils/bookingRequestOfferParticipantAmendmentApply';
import { emailAddressPresent } from '../utils/emailAddressPresent';

/**
 * Admin applies a post–dual-accept booking change immediately (bypasses cook
 * approval). Reuses amendment Stripe money rules. No feature toggle.
 */
export async function adminBookingRequestOfferAmendmentApply(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferAmendmentApplyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestOfferId = args.bookingRequestOfferId.trim();
    if (bookingRequestOfferId.length === 0) {
        throw new Error('adminBookingRequestOfferAmendmentApply: bookingRequestOfferId must not be empty');
    }

    try {
        const prepared = await bookingRequestOfferAdminAmendmentPrepare(serverRuntime, {
            bookingRequestOfferId,
            participants: args.input.participants,
            exactEventAddress: args.input.exactEventAddress,
            menuPriceCents: args.input.menuPriceCents,
            travelExpensesCents: args.input.travelExpensesCents,
            travelDistanceKm: args.input.travelDistanceKm,
            errorPrefix: 'adminBookingRequestOfferAmendmentApply',
        });

        // Persist pending amendment so apply can claim it (same Stripe idempotency path as cook accept).
        await serverRuntime.db
            .update(bookingRequestOffers)
            .set({ participantAmendment: prepared.amendment })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        const [freshOffer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);
        if (!freshOffer?.participantAmendment) {
            throw new Error('adminBookingRequestOfferAmendmentApply: failed to stage amendment');
        }

        const applyResult = await bookingRequestOfferParticipantAmendmentApply(serverRuntime, {
            offer: freshOffer,
            bookingRequest: prepared.bookingRequest,
            cook: prepared.cook,
            customer: prepared.customer,
            existingParticipants: prepared.existingParticipants,
            amendment: freshOffer.participantAmendment,
            giftCard: prepared.giftCard,
            promoCode: prepared.promoCode,
            travelDistanceKmAfter: prepared.travelDistanceKmAfter,
            travelExpensesCentsAfter: prepared.travelExpensesCentsAfter,
            acceptEventType: 'ADMIN_PARTICIPANT_AMENDMENT_APPLIED',
        });

        const [updatedOffer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: prepared.customer.userId }),
            serverRuntime.publish.userUpdates({ userId: prepared.cook.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        const [cookRow] = await serverRuntime.db.select().from(users).where(eq(users.userId, prepared.cook.cookId)).limit(1);
        const customer = emailAddressPresent(prepared.customer);
        const cook = cookRow ? emailAddressPresent(cookRow) : null;
        if (customer && cook && updatedOffer) {
            await bookingRequestOfferParticipantAmendmentAcceptEmailSend(serverRuntime, {
                bookingRequest: prepared.bookingRequest,
                offer: updatedOffer,
                customer,
                cook,
                customerDeltaCents: applyResult.customerDeltaCents,
                giftCardDeltaCents: applyResult.giftCardDeltaCents,
                paymentStatus: applyResult.paymentStatus,
                pendingDeltaPaymentDue: applyResult.pendingDeltaPaymentDue,
            });
        }

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
