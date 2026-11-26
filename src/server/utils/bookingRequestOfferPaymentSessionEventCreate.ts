import { sql } from 'drizzle-orm';

import { bookingRequestCheckoutFunnelArea } from '../../shared/bookingRequestCheckoutFunnel';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { sessionEventCreate } from './sessionEventCreate';
import { sessionIdForUserLatestFind } from './sessionIdForUserLatestFind';

type PaymentSessionEventInput = {
    sessionId?: string | null;
    customerUserId: string;
    bookingRequestId: string;
    bookingRequestOfferId: string;
};

async function sessionIdForBookingRequestCheckoutFind(
    serverRuntime: ServerRuntime,
    customerUserId: string,
    bookingRequestId: string,
): Promise<string | null> {
    const result = await serverRuntime.db.execute<{ session_id: string }>(sql`
        SELECT e."sessionId" AS session_id
        FROM "SessionEvents" e
        INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
        WHERE s."userId" = ${customerUserId}
          AND e.type = 'WEB_PAGE_INTERACTION'
          AND e.payload->>'area' = ${bookingRequestCheckoutFunnelArea}
          AND e.payload->>'bookingRequestId' = ${bookingRequestId}
        ORDER BY e."createdAt" DESC
        LIMIT 1
    `);
    const rows = Array.isArray(result) ? result : result.rows;
    return rows[0]?.session_id ?? null;
}

async function sessionIdForPaymentEvent(serverRuntime: ServerRuntime, input: PaymentSessionEventInput): Promise<string | null> {
    if (input.sessionId) return input.sessionId;
    return (
        (await sessionIdForBookingRequestCheckoutFind(serverRuntime, input.customerUserId, input.bookingRequestId)) ??
        (await sessionIdForUserLatestFind(serverRuntime, input.customerUserId))
    );
}

/**
 * Emits `BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED` on the customer session.
 * Prefers an explicit `sessionId` (GraphQL path); otherwise the session that
 * already has checkout funnel interactions for this booking request; otherwise
 * the customer's latest non-terminated session (webhooks / jobs).
 */
export async function bookingRequestOfferPaymentSucceededSessionEventCreate(
    serverRuntime: ServerRuntime,
    input: PaymentSessionEventInput,
): Promise<void> {
    const sessionId = await sessionIdForPaymentEvent(serverRuntime, input);
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
    input: PaymentSessionEventInput,
): Promise<void> {
    const sessionId = await sessionIdForPaymentEvent(serverRuntime, input);
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
