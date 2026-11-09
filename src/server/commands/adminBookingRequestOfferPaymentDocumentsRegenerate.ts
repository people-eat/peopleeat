import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferPaymentDocumentsRegenerateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferPaymentPdfsCreate } from '../utils/bookingRequestOfferPaymentPdfsCreate';

export async function adminBookingRequestOfferPaymentDocumentsRegenerate(
    { adminId }: GqlSAdminMutation,
    { bookingRequestOfferId }: GqlSAdminMutationBookingRequestOfferPaymentDocumentsRegenerateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const [row] = await serverRuntime.db
            .select({
                paymentStatus: bookingRequestOffers.paymentStatus,
                cookId: bookingRequestOffers.cookId,
                customerUserId: bookingRequests.userId,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!row || !bookingRequestOfferPaymentIsPaid(row.paymentStatus)) {
            return { success: false };
        }

        const pdfs = await bookingRequestOfferPaymentPdfsCreate(bookingRequestOfferId, serverRuntime);
        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: row.customerUserId }),
            serverRuntime.publish.userUpdates({ userId: row.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);
        return pdfs.customerReceipt || pdfs.cookStatement ? { success: true, referenceId: bookingRequestOfferId } : { success: false };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
