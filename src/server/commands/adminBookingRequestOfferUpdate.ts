import { eq } from 'drizzle-orm';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequestOfferPaymentStatus } from '../domain/bookingRequest';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferEventTomorrowNotifySchedule } from '../utils/bookingRequestOfferEventTomorrowNotifySchedule';

function assertNonNegativeInt(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`adminBookingRequestOfferUpdate: ${fieldName} must be a non-negative integer`);
    }
}

export async function adminBookingRequestOfferUpdate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestOfferId = args.bookingRequestOfferId.trim();
    if (bookingRequestOfferId.length === 0) {
        throw new Error('adminBookingRequestOfferUpdate: bookingRequestOfferId must not be empty');
    }

    const input = args.input;

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!row) {
            throw new Error('adminBookingRequestOfferUpdate: offer not found');
        }

        const { offer, bookingRequest } = row;

        const offerPatch: {
            userAccepted?: boolean | null;
            cookAccepted?: boolean | null;
            menuPriceCents?: number;
            travelExpensesCents?: number;
            paymentProviderFeeCents?: number;
            platformFeePercentCook?: number;
            platformFeePercentCustomer?: number;
            platformFeeCentsCook?: number;
            platformFeeCentsCustomer?: number;
            payoutCentsCook?: number;
            totalWithoutDiscountsCentsCustomer?: number;
            totalCentsCustomer?: number;
            travelDistanceKm?: number | null;
            paymentDateTime?: Date | null;
            plannedPayoutDateTime?: Date | null;
            payoutDateTime?: Date | null;
            paymentStatus?: BookingRequestOfferPaymentStatus;
        } = {};

        if (input.userAccepted !== undefined) {
            offerPatch.userAccepted = input.userAccepted;
        }
        if (input.cookAccepted !== undefined) {
            offerPatch.cookAccepted = input.cookAccepted;
        }

        const nextMenuPriceCents = input.menuPriceCents ?? offer.menuPriceCents;
        const nextTravelExpensesCents = input.travelExpensesCents ?? offer.travelExpensesCents;
        const priceInputsChanged = input.menuPriceCents != null || input.travelExpensesCents != null;

        if (input.menuPriceCents != null) {
            assertNonNegativeInt(input.menuPriceCents, 'menuPriceCents');
            if (input.menuPriceCents <= 0) {
                throw new Error('adminBookingRequestOfferUpdate: menuPriceCents must be a positive integer');
            }
        }
        if (input.travelExpensesCents != null) {
            assertNonNegativeInt(input.travelExpensesCents, 'travelExpensesCents');
        }

        if (priceInputsChanged) {
            const price = bookingRequestOfferPriceCalculate({
                menuPriceCents: nextMenuPriceCents,
                travelExpensesCents: nextTravelExpensesCents,
            });
            offerPatch.menuPriceCents = price.menuPriceCents;
            offerPatch.travelExpensesCents = price.travelExpensesCents;
            offerPatch.paymentProviderFeeCents = price.paymentProviderFeeCents;
            offerPatch.platformFeePercentCook = price.platformFeePercentCook;
            offerPatch.platformFeePercentCustomer = price.platformFeePercentCustomer;
            offerPatch.platformFeeCentsCook = price.platformFeeCentsCook;
            offerPatch.platformFeeCentsCustomer = price.platformFeeCentsCustomer;
            offerPatch.payoutCentsCook = price.payoutCentsCook;
            offerPatch.totalWithoutDiscountsCentsCustomer = price.totalWithoutDiscountsCentsCustomer;
            if (offer.totalCentsCustomer != null) {
                const discountCents = Math.max(0, offer.totalWithoutDiscountsCentsCustomer - offer.totalCentsCustomer);
                offerPatch.totalCentsCustomer = Math.max(0, price.totalWithoutDiscountsCentsCustomer - discountCents);
            }
        }

        if (input.travelDistanceKm !== undefined) {
            offerPatch.travelDistanceKm = input.travelDistanceKm;
        }
        if (input.paymentDateTime !== undefined) {
            offerPatch.paymentDateTime = input.paymentDateTime;
        }
        if (input.plannedPayoutDateTime !== undefined) {
            offerPatch.plannedPayoutDateTime = input.plannedPayoutDateTime;
        }
        if (input.payoutDateTime !== undefined) {
            offerPatch.payoutDateTime = input.payoutDateTime;
        }

        const nextUserAccepted = offerPatch.userAccepted !== undefined ? offerPatch.userAccepted : offer.userAccepted;
        const nextCookAccepted = offerPatch.cookAccepted !== undefined ? offerPatch.cookAccepted : offer.cookAccepted;
        let becamePaidOutOfSystem = false;
        if (nextUserAccepted === true && nextCookAccepted === true && offer.paymentStatus === 'EMPTY') {
            offerPatch.paymentStatus = 'PAYED_OUT_OF_SYSTEM';
            becamePaidOutOfSystem = true;
        }

        if (Object.keys(offerPatch).length === 0) {
            return { success: true, referenceId: bookingRequestOfferId };
        }

        await serverRuntime.db
            .update(bookingRequestOffers)
            .set(offerPatch)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        if (becamePaidOutOfSystem || (offerPatch.paymentStatus != null && bookingRequestOfferPaymentIsPaid(offerPatch.paymentStatus))) {
            await bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
                bookingRequestId: bookingRequest.bookingRequestId,
                bookingRequestOfferId,
                eventDate: bookingRequest.dateTime,
            });
        }

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
