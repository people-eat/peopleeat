import { dateAddDays, dateDistanceInDaysToToday } from '../../shared';
import {
    BOOKING_PAYMENT_PULL_ANNOUNCEMENT_DAYS_BEFORE_EVENT,
    BOOKING_PAYMENT_PULL_DAYS_BEFORE_EVENT,
    BOOKING_PAYMENT_SETUP_INTENT_MIN_DAYS,
    BOOKING_PAYMENT_TIME_ZONE,
} from '../domain/bookingPayment';
import type { BookingRequestOfferPaymentData, BookingRequestOfferPaymentStatus } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';

export type BookingRequestOfferPaymentPrepareInput = {
    userId: string;
    emailAddress: string;
    firstName: string;
    lastName: string;
    destinationAccountId: string;
    totalCentsCustomer: number;
    payoutCentsCook: number;
    eventDateTime: Date;
};

export type BookingRequestOfferPaymentPrepareResult = {
    paymentData: BookingRequestOfferPaymentData;
    paymentStatus: BookingRequestOfferPaymentStatus;
    plannedPaymentPullDateTime: Date | null;
    paymentDateTime: Date | null;
    plannedPayoutDateTime: Date;
};

/**
 * Creates the Stripe intent / transfer for a dual-accepted offer.
 * €0 → immediate transfer + PAYED; &lt;15d → PaymentIntent; else SetupIntent.
 */
export async function bookingRequestOfferPaymentPrepare(
    serverRuntime: Pick<ServerRuntime, 'stripe'>,
    input: BookingRequestOfferPaymentPrepareInput,
): Promise<BookingRequestOfferPaymentPrepareResult> {
    const { userId, emailAddress, firstName, lastName, destinationAccountId, totalCentsCustomer, payoutCentsCook, eventDateTime } = input;

    const stripeUser = { userId, emailAddress, firstName, lastName };
    const daysUntilEvent = dateDistanceInDaysToToday(eventDateTime, BOOKING_PAYMENT_TIME_ZONE);

    if (totalCentsCustomer === 0) {
        const { transferId } = await serverRuntime.stripe.transferCreate({
            destinationAccountId,
            payoutAmount: payoutCentsCook,
        });
        return {
            paymentData: { transferId },
            paymentStatus: 'PAYED',
            plannedPaymentPullDateTime: null,
            paymentDateTime: new Date(),
            plannedPayoutDateTime: dateAddDays(eventDateTime, 2),
        };
    }

    if (daysUntilEvent < BOOKING_PAYMENT_SETUP_INTENT_MIN_DAYS) {
        const { clientSecret, paymentIntentId } = await serverRuntime.stripe.paymentIntentCreateWithSplit({
            user: stripeUser,
            destinationAccountId,
            pullAmount: totalCentsCustomer,
            payoutAmount: payoutCentsCook,
        });
        return {
            paymentData: { clientSecret, paymentIntentId },
            paymentStatus: 'EMPTY',
            plannedPaymentPullDateTime: null,
            paymentDateTime: null,
            plannedPayoutDateTime: dateAddDays(eventDateTime, 2),
        };
    }

    const { clientSecret, setupIntentId } = await serverRuntime.stripe.setupIntentCreate({ user: stripeUser });
    return {
        paymentData: { clientSecret, setupIntentId },
        paymentStatus: 'EMPTY',
        plannedPaymentPullDateTime: dateAddDays(eventDateTime, -BOOKING_PAYMENT_PULL_DAYS_BEFORE_EVENT),
        paymentDateTime: null,
        plannedPayoutDateTime: dateAddDays(eventDateTime, 1),
    };
}

/** Days before event used when scheduling the pull-announcement job. */
export function bookingRequestOfferPullAnnouncementDueDate(eventDateTime: Date): Date {
    return dateAddDays(eventDateTime, -BOOKING_PAYMENT_PULL_ANNOUNCEMENT_DAYS_BEFORE_EVENT);
}

/** Days before event used when scheduling the off-session pull job. */
export function bookingRequestOfferPullPaymentDueDate(eventDateTime: Date): Date {
    return dateAddDays(eventDateTime, -BOOKING_PAYMENT_PULL_DAYS_BEFORE_EVENT);
}

export function bookingRequestOfferShouldAnnouncePull(eventDateTime: Date): boolean {
    return dateDistanceInDaysToToday(eventDateTime, BOOKING_PAYMENT_TIME_ZONE) > BOOKING_PAYMENT_SETUP_INTENT_MIN_DAYS;
}
