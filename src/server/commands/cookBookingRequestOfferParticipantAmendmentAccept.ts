import { and, eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferParticipantAmendmentAcceptArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferParticipantAmendmentAcceptEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferParticipantAmendmentApply } from '../utils/bookingRequestOfferParticipantAmendmentApply';
import {
    bookingRequestOfferIsDualAccepted,
    bookingRequestOfferParticipantAmendmentPaymentAllowed,
} from '../utils/bookingRequestOfferParticipantAmendmentGates';
import { emailAddressPresent } from '../utils/emailAddressPresent';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function cookBookingRequestOfferParticipantAmendmentAccept(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferParticipantAmendmentAcceptArgs,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferParticipantAmendmentAccept');

    const { bookingRequestOfferId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
                cook: cooks,
                customer: users,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .innerJoin(users, eq(users.userId, bookingRequests.userId))
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferParticipantAmendmentAccept: offer not found');
        }

        const amendment = row.offer.participantAmendment;
        if (!amendment) {
            throw new Error('cookBookingRequestOfferParticipantAmendmentAccept: no pending amendment');
        }
        if (!bookingRequestOfferIsDualAccepted(row.offer)) {
            throw new Error('cookBookingRequestOfferParticipantAmendmentAccept: offer is not dual-accepted');
        }
        if (!bookingRequestOfferParticipantAmendmentPaymentAllowed(row.offer.paymentStatus)) {
            throw new Error('cookBookingRequestOfferParticipantAmendmentAccept: payment status does not allow amendment');
        }
        if (row.bookingRequest.canceledAt != null || row.bookingRequest.dateTime.getTime() <= Date.now()) {
            throw new Error('cookBookingRequestOfferParticipantAmendmentAccept: booking is not amendable');
        }

        const existingParticipants = await serverRuntime.db
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, row.bookingRequest.bookingRequestId));

        const totalCentsCustomerBefore = row.offer.totalCentsCustomer ?? row.offer.totalWithoutDiscountsCentsCustomer;

        await bookingRequestOfferParticipantAmendmentApply(serverRuntime, {
            offer: row.offer,
            bookingRequest: row.bookingRequest,
            cook: row.cook,
            customer: row.customer,
            existingParticipants,
            amendment,
        });

        const [updatedOffer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.customer.userId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        const [cookRow] = await serverRuntime.db.select().from(users).where(eq(users.userId, cookId)).limit(1);
        const customer = emailAddressPresent(row.customer);
        const cook = cookRow ? emailAddressPresent(cookRow) : null;
        if (customer && cook && updatedOffer) {
            await bookingRequestOfferParticipantAmendmentAcceptEmailSend(serverRuntime, {
                bookingRequest: row.bookingRequest,
                offer: updatedOffer,
                customer,
                cook,
                customerDeltaCents: (updatedOffer.totalCentsCustomer ?? 0) - totalCentsCustomerBefore,
            });
        }

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error);
        return { success: false };
    }
}
