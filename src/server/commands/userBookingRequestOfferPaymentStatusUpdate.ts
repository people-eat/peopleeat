import { and, eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { BookingRequestInvoiceAddress } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferPaymentStatusUpdateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferPaymentFinalize } from '../utils/bookingRequestOfferPaymentFinalize';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

function invoiceAddressAssert(invoiceAddress: BookingRequestInvoiceAddress): void {
    const required = [
        invoiceAddress.firstName,
        invoiceAddress.lastName,
        invoiceAddress.country,
        invoiceAddress.city,
        invoiceAddress.postalCode,
        invoiceAddress.line1,
    ];
    if (required.some((value) => value.trim().length === 0)) {
        throw new Error('userBookingRequestOfferPaymentStatusUpdate: invoice address incomplete');
    }
    if (!/^[A-Za-z]{2}$/.test(invoiceAddress.country.trim())) {
        throw new Error('userBookingRequestOfferPaymentStatusUpdate: invoice country must be ISO alpha-2');
    }
}

/**
 * Customer finalizes Stripe SI/PI after Elements confirm — stores invoice address,
 * advances paymentStatus (SETUP | PAYED), enqueues pull jobs for SetupIntent.
 */
export async function userBookingRequestOfferPaymentStatusUpdate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferPaymentStatusUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'userBookingRequestOfferPaymentStatusUpdate');

    const { bookingRequestOfferId, invoiceAddress: invoiceAddressInput } = args;

    try {
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
            throw new Error('userBookingRequestOfferPaymentStatusUpdate: offer not found');
        }

        if (!row.cook.stripeAccountId) {
            throw new Error('userBookingRequestOfferPaymentStatusUpdate: cook Stripe account missing');
        }

        const invoiceAddress: BookingRequestInvoiceAddress = {
            companyName: invoiceAddressInput.companyName || null,
            firstName: invoiceAddressInput.firstName.trim(),
            lastName: invoiceAddressInput.lastName.trim(),
            country: invoiceAddressInput.country.trim().toUpperCase(),
            city: invoiceAddressInput.city.trim(),
            postalCode: invoiceAddressInput.postalCode.trim(),
            line1: invoiceAddressInput.line1.trim(),
            line2: invoiceAddressInput.line2.trim(),
        };
        invoiceAddressAssert(invoiceAddress);

        await serverRuntime.stripe.customerUpdate({
            userId,
            firstName: invoiceAddress.firstName,
            lastName: invoiceAddress.lastName,
            address: {
                country: invoiceAddress.country,
                city: invoiceAddress.city,
                postCode: invoiceAddress.postalCode,
                line1: invoiceAddress.line1,
                line2: invoiceAddress.line2 || undefined,
            },
        });

        await bookingRequestOfferPaymentFinalize(serverRuntime, {
            offer: row.offer,
            bookingRequest: row.bookingRequest,
            customerUserId: userId,
            cookStripeAccountId: row.cook.stripeAccountId,
            invoiceAddress,
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
