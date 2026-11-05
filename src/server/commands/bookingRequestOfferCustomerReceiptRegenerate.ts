import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferCustomerReceiptRegenerateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferPaymentPdfsCreate } from '../utils/bookingRequestOfferPaymentPdfsCreate';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function bookingRequestOfferCustomerReceiptRegenerate(
    { userId }: GqlSUserMutation,
    { bookingRequestOfferId }: GqlSUserMutationBookingRequestOfferCustomerReceiptRegenerateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'bookingRequestOfferCustomerReceiptRegenerate');

    try {
        const [row] = await serverRuntime.db
            .select({
                paymentStatus: bookingRequestOffers.paymentStatus,
                customerUserId: bookingRequests.userId,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!row || row.customerUserId !== userId || !bookingRequestOfferPaymentIsPaid(row.paymentStatus)) {
            return { success: false };
        }
        if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS', serverRuntime, userId))) {
            return { success: false };
        }

        const pdfs = await bookingRequestOfferPaymentPdfsCreate(bookingRequestOfferId, serverRuntime, { audience: 'customer' });
        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
        return pdfs.customerReceipt ? { success: true, referenceId: bookingRequestOfferId } : { success: false };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
