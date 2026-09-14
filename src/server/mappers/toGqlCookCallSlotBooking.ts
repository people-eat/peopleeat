import type { CookCallSlotBooking } from '../db/schema';
import type { GqlSCookCallSlotBooking, GqlSCookCallSlotBookingCustomer } from '../graphql/generated';

export function toGqlCookCallSlotBooking(row: CookCallSlotBooking, customer?: GqlSCookCallSlotBookingCustomer): GqlSCookCallSlotBooking {
    return {
        cookCallSlotBookingId: row.cookCallSlotBookingId,
        cookId: row.cookId,
        userId: row.userId,
        bookingRequestOfferId: row.bookingRequestOfferId,
        startAt: row.startAt,
        endAt: row.endAt,
        status: row.status,
        initiator: row.initiator,
        customerMessage: row.customerMessage ?? null,
        cookMessage: row.cookMessage ?? null,
        declineReason: row.declineReason ?? null,
        canceledBy: row.canceledBy ?? null,
        canceledReason: row.canceledReason ?? null,
        videoCallRoomId: row.videoCallRoomId ?? null,
        customer: customer ?? { display: '' },
        createdAt: row.createdAt,
        lastModifiedAt: row.lastModifiedAt,
    };
}
