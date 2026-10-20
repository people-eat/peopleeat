import type { ServerRuntime } from '../domain/ServerRuntime';
import { sessionEventCreate } from './sessionEventCreate';
import { sessionIdForUserLatestFind } from './sessionIdForUserLatestFind';

/**
 * Emits `BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED` on the customer session.
 * Prefers an explicit `sessionId` (GraphQL path); otherwise uses the customer's
 * latest non-terminated session (webhooks / jobs).
 */
export async function bookingRequestOfferPaymentSucceededSessionEventCreate(
    serverRuntime: ServerRuntime,
    input: {
        sessionId?: string | null;
        customerUserId: string;
        bookingRequestId: string;
        bookingRequestOfferId: string;
    },
): Promise<void> {
    const sessionId = input.sessionId ?? (await sessionIdForUserLatestFind(serverRuntime, input.customerUserId));
    if (sessionId == null) return;
    await sessionEventCreate(serverRuntime, {
        sessionId,
        type: 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED',
        payload: {
            bookingRequestId: input.bookingRequestId,
            bookingRequestOfferId: input.bookingRequestOfferId,
        },
    });
}

export async function bookingRequestOfferPaymentFailedSessionEventCreate(
    serverRuntime: ServerRuntime,
    input: {
        sessionId?: string | null;
        customerUserId: string;
        bookingRequestId: string;
        bookingRequestOfferId: string;
    },
): Promise<void> {
    const sessionId = input.sessionId ?? (await sessionIdForUserLatestFind(serverRuntime, input.customerUserId));
    if (sessionId == null) return;
    await sessionEventCreate(serverRuntime, {
        sessionId,
        type: 'BOOKING_REQUEST_OFFER_PAYMENT_FAILED',
        payload: {
            bookingRequestId: input.bookingRequestId,
            bookingRequestOfferId: input.bookingRequestOfferId,
        },
    });
}
