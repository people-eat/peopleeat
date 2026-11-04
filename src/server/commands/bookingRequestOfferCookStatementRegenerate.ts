import { eq } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferCookStatementRegenerateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferPaymentPdfsCreate } from '../utils/bookingRequestOfferPaymentPdfsCreate';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function bookingRequestOfferCookStatementRegenerate(
    { cookId }: GqlSCookMutation,
    { bookingRequestOfferId }: GqlSCookMutationBookingRequestOfferCookStatementRegenerateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const [offer] = await serverRuntime.db
            .select({
                cookId: bookingRequestOffers.cookId,
                paymentStatus: bookingRequestOffers.paymentStatus,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!offer || offer.cookId !== cookId || !bookingRequestOfferPaymentIsPaid(offer.paymentStatus)) {
            return { success: false };
        }
        if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS', serverRuntime, cookId))) {
            return { success: false };
        }

        const pdfs = await bookingRequestOfferPaymentPdfsCreate(bookingRequestOfferId, serverRuntime, { audience: 'cook' });
        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        return pdfs.cookStatement ? { success: true, referenceId: bookingRequestOfferId } : { success: false };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
