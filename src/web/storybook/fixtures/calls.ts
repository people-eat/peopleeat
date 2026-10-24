import type { BookingRequestOfferCallBookingCardBooking } from '../../components/BookingRequestOfferCallBookingCard';
import type { CallBookingOverviewItem } from '../../components/callBookingOverviewHint';

const DAY = 24 * 60 * 60 * 1000;

function isoAtOffset(daysFromNow: number, hourUtc: number, minute = 0): string {
    const date = new Date(Date.UTC(2026, 10, 10 + daysFromNow, hourUtc, minute, 0));
    return date.toISOString();
}

function callBookingFixture(
    overrides: Partial<BookingRequestOfferCallBookingCardBooking> &
        Pick<BookingRequestOfferCallBookingCardBooking, 'cookCallSlotBookingId' | 'status' | 'initiator'> = {
        cookCallSlotBookingId: 'callSlotFixture000001',
        status: 'PENDING',
        initiator: 'CUSTOMER',
    },
): BookingRequestOfferCallBookingCardBooking {
    const startAt = overrides.startAt ?? isoAtOffset(3, 16, 0);
    const endAt = overrides.endAt ?? isoAtOffset(3, 16, 30);
    return {
        cookCallSlotBookingId: overrides.cookCallSlotBookingId,
        startAt,
        endAt,
        status: overrides.status,
        initiator: overrides.initiator,
        customerMessage: overrides.customerMessage,
        cookMessage: overrides.cookMessage,
        declineReason: overrides.declineReason,
        canceledReason: overrides.canceledReason,
        videoCallRoomId: overrides.videoCallRoomId,
    };
}

export const callBookingsByStatus = {
    pendingFromCustomer: callBookingFixture({
        cookCallSlotBookingId: 'callPendingCustomer01',
        status: 'PENDING',
        initiator: 'CUSTOMER',
        customerMessage: 'Können wir kurz über Allergien sprechen?',
        startAt: isoAtOffset(2, 15, 0),
        endAt: isoAtOffset(2, 15, 30),
    }),
    pendingFromCook: callBookingFixture({
        cookCallSlotBookingId: 'callPendingCook00001',
        status: 'PENDING',
        initiator: 'COOK',
        cookMessage: 'Ich würde das Menü gerne vorab abstimmen.',
        startAt: isoAtOffset(4, 17, 0),
        endAt: isoAtOffset(4, 17, 30),
    }),
    confirmed: callBookingFixture({
        cookCallSlotBookingId: 'callConfirmed0000001',
        status: 'CONFIRMED',
        initiator: 'CUSTOMER',
        startAt: isoAtOffset(5, 16, 0),
        endAt: isoAtOffset(5, 16, 30),
        videoCallRoomId: 'roomFixture000000001',
    }),
    declined: callBookingFixture({
        cookCallSlotBookingId: 'callDeclined00000001',
        status: 'DECLINED',
        initiator: 'COOK',
        declineReason: 'Leider passt der Termin nicht.',
        startAt: isoAtOffset(1, 14, 0),
        endAt: isoAtOffset(1, 14, 30),
    }),
    canceled: callBookingFixture({
        cookCallSlotBookingId: 'callCanceled00000001',
        status: 'CANCELED',
        initiator: 'CUSTOMER',
        canceledReason: 'ANOTHER_SLOT_CONFIRMED',
        startAt: isoAtOffset(1, 18, 0),
        endAt: isoAtOffset(1, 18, 30),
    }),
    completed: callBookingFixture({
        cookCallSlotBookingId: 'callCompleted0000001',
        status: 'COMPLETED',
        initiator: 'COOK',
        startAt: new Date(Date.now() - 2 * DAY).toISOString(),
        endAt: new Date(Date.now() - 2 * DAY + 30 * 60 * 1000).toISOString(),
    }),
} as const;

export function callOverviewItems(...bookings: BookingRequestOfferCallBookingCardBooking[]): CallBookingOverviewItem[] {
    return bookings.map((booking) => ({
        cookCallSlotBookingId: booking.cookCallSlotBookingId,
        startAt: booking.startAt,
        endAt: booking.endAt,
        status: booking.status,
        initiator: booking.initiator,
    }));
}
