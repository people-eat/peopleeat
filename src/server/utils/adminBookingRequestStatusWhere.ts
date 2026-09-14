import { and, eq, exists, gte, inArray, isNotNull, isNull, lt, not, notExists, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequestStatus } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';

/**
 * SQL predicates that mirror `bookingRequestStatusDerive` for list/count filters.
 * Derived lifecycle is not stored on `BookingRequests`.
 */
export function adminBookingRequestStatusWhere(
    statuses: readonly BookingRequestStatus[],
    db: ServerRuntime['db'],
    now: Date = new Date(),
): SQL | undefined {
    if (statuses.length === 0) return undefined;

    const unique = [...new Set(statuses)];
    const clauses = unique.map((status) => adminBookingRequestStatusClause(status, db, now));
    if (clauses.length === 1) return clauses[0];
    return or(...clauses);
}

function dualAcceptedOfferExists(db: ServerRuntime['db'], paymentStatus?: 'EMPTY' | 'SETUP' | 'paidLike'): SQL {
    const parts: SQL[] = [
        eq(bookingRequestOffers.bookingRequestId, bookingRequests.bookingRequestId),
        eq(bookingRequestOffers.userAccepted, true),
        eq(bookingRequestOffers.cookAccepted, true),
    ];
    if (paymentStatus === 'EMPTY' || paymentStatus === 'SETUP') {
        parts.push(eq(bookingRequestOffers.paymentStatus, paymentStatus));
    } else if (paymentStatus === 'paidLike') {
        parts.push(not(inArray(bookingRequestOffers.paymentStatus, ['EMPTY', 'SETUP'])));
    }

    return exists(
        db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .where(and(...parts)),
    );
}

function anyOfferExists(db: ServerRuntime['db']): SQL {
    return exists(
        db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestId, bookingRequests.bookingRequestId)),
    );
}

function noAcceptedOffer(db: ServerRuntime['db']): SQL {
    return not(dualAcceptedOfferExists(db));
}

function notExpired(now: Date): SQL {
    return or(isNull(bookingRequests.expiresAt), gte(bookingRequests.expiresAt, now))!;
}

function adminBookingRequestStatusClause(status: BookingRequestStatus, db: ServerRuntime['db'], now: Date): SQL {
    switch (status) {
        case 'CANCELED':
            return isNotNull(bookingRequests.canceledAt);
        case 'EXPIRED':
            return and(
                isNull(bookingRequests.canceledAt),
                noAcceptedOffer(db),
                isNotNull(bookingRequests.expiresAt),
                lt(bookingRequests.expiresAt, now),
            )!;
        case 'WAITING_FOR_OFFERS':
            return and(
                isNull(bookingRequests.canceledAt),
                noAcceptedOffer(db),
                notExpired(now),
                notExists(
                    db
                        .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
                        .from(bookingRequestOffers)
                        .where(eq(bookingRequestOffers.bookingRequestId, bookingRequests.bookingRequestId)),
                ),
            )!;
        case 'OFFERS_WAITING_FOR_REVIEW':
            return and(isNull(bookingRequests.canceledAt), noAcceptedOffer(db), notExpired(now), anyOfferExists(db))!;
        case 'DEPOSIT_PAYMENT_PENDING':
            return and(isNull(bookingRequests.canceledAt), dualAcceptedOfferExists(db, 'EMPTY'))!;
        case 'PAYMENT_PULL_PENDING':
            return and(isNull(bookingRequests.canceledAt), dualAcceptedOfferExists(db, 'SETUP'))!;
        case 'EVENT_PENDING':
            return and(isNull(bookingRequests.canceledAt), dualAcceptedOfferExists(db, 'paidLike'), gte(bookingRequests.dateTime, now))!;
        case 'COMPLETED':
            return and(isNull(bookingRequests.canceledAt), dualAcceptedOfferExists(db, 'paidLike'), lt(bookingRequests.dateTime, now))!;
        default: {
            const _exhaustive: never = status;
            return _exhaustive;
        }
    }
}
