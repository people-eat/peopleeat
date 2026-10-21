import { and, eq, inArray } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { DatabaseTransaction } from '../db';
import { bookingRequestOfferEvents, cookCallSlotBookings } from '../db/schema';
import type { BookingRequestOfferEventType, CookCallSlotBookingActor } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferCallSlotsCompleteCancel } from './bookingRequestOfferCallSlotsCompleteSchedule';

export type BookingRequestOfferPendingCallSlotsCloseReason =
    | { kind: 'OFFER_DECLINED'; declinedBy: CookCallSlotBookingActor }
    | { kind: 'BOOKING_REQUEST_EXPIRED' }
    | { kind: 'BOOKING_REQUEST_CANCELED' };

/**
 * Closes PENDING call-slot requests on the given offers (no lifecycle email).
 * Offer decline → DECLINED + party decline events; booking-request expiry /
 * cancel → CANCELED with a system reason. Same idea as sibling auto-cancel on
 * confirm.
 */
export async function bookingRequestOfferPendingCallSlotsClose(
    transaction: DatabaseTransaction,
    args: {
        bookingRequestOfferIds: string[];
        reason: BookingRequestOfferPendingCallSlotsCloseReason;
        now: Date;
    },
): Promise<string[]> {
    const { bookingRequestOfferIds, reason, now } = args;
    if (bookingRequestOfferIds.length === 0) {
        return [];
    }

    const pending = await transaction
        .select({
            cookCallSlotBookingId: cookCallSlotBookings.cookCallSlotBookingId,
            bookingRequestOfferId: cookCallSlotBookings.bookingRequestOfferId,
            startAt: cookCallSlotBookings.startAt,
            endAt: cookCallSlotBookings.endAt,
        })
        .from(cookCallSlotBookings)
        .where(
            and(inArray(cookCallSlotBookings.bookingRequestOfferId, bookingRequestOfferIds), eq(cookCallSlotBookings.status, 'PENDING')),
        );

    if (pending.length === 0) {
        return [];
    }

    const cookCallSlotBookingIds = pending.map((slot) => slot.cookCallSlotBookingId);

    if (reason.kind === 'OFFER_DECLINED') {
        await transaction
            .update(cookCallSlotBookings)
            .set({
                status: 'DECLINED',
                declineReason: 'OFFER_DECLINED',
                lastModifiedAt: now,
            })
            .where(inArray(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingIds));

        const eventType: BookingRequestOfferEventType =
            reason.declinedBy === 'CUSTOMER' ? 'USER_CALL_SLOT_DECLINED' : 'COOK_CALL_SLOT_DECLINED';

        await transaction.insert(bookingRequestOfferEvents).values(
            pending.map((slot) => ({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId: slot.bookingRequestOfferId,
                type: eventType,
                payload: {
                    cookCallSlotBookingId: slot.cookCallSlotBookingId,
                    startAt: slot.startAt.toISOString(),
                    endAt: slot.endAt.toISOString(),
                    declineReason: 'OFFER_DECLINED',
                },
                createdAt: now,
            })),
        );

        return cookCallSlotBookingIds;
    }

    const canceledReason = reason.kind === 'BOOKING_REQUEST_EXPIRED' ? 'BOOKING_REQUEST_EXPIRED' : 'BOOKING_REQUEST_CANCELED';

    await transaction
        .update(cookCallSlotBookings)
        .set({
            status: 'CANCELED',
            canceledReason,
            lastModifiedAt: now,
        })
        .where(inArray(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingIds));

    await transaction.insert(bookingRequestOfferEvents).values(
        pending.map((slot) => ({
            bookingRequestOfferEventId: idCreate(),
            bookingRequestOfferId: slot.bookingRequestOfferId,
            type: 'USER_CALL_SLOT_CANCELLED' as const,
            payload: {
                cookCallSlotBookingId: slot.cookCallSlotBookingId,
                startAt: slot.startAt.toISOString(),
                endAt: slot.endAt.toISOString(),
                wasConfirmed: false,
                reason: canceledReason,
            },
            createdAt: now,
        })),
    );

    return cookCallSlotBookingIds;
}

/** Cancels queued complete/expire jobs for slots closed by {@link bookingRequestOfferPendingCallSlotsClose}. */
export async function bookingRequestOfferPendingCallSlotsCompleteJobsCancel(
    serverRuntime: ServerRuntime,
    cookCallSlotBookingIds: string[],
): Promise<void> {
    if (cookCallSlotBookingIds.length === 0) {
        return;
    }
    await Promise.all(
        cookCallSlotBookingIds.map((cookCallSlotBookingId) =>
            bookingRequestOfferCallSlotsCompleteCancel(serverRuntime, cookCallSlotBookingId),
        ),
    );
}
