import type { BookingRequest, SupportRequest } from '../db/schema';
import type { GqlSSupportRequestBookingRequestSummary, GqlSUserSupportRequest } from '../graphql/generated';

export function toGqlSupportRequestBookingRequestSummary(
    bookingRequest: Pick<BookingRequest, 'bookingRequestId' | 'occasion' | 'dateTime'>,
): GqlSSupportRequestBookingRequestSummary {
    return {
        bookingRequestId: bookingRequest.bookingRequestId,
        occasion: bookingRequest.occasion,
        dateTime: bookingRequest.dateTime,
    };
}

export function toGqlUserSupportRequest(
    supportRequest: SupportRequest,
    bookingRequest: GqlSSupportRequestBookingRequestSummary | null,
): GqlSUserSupportRequest {
    return {
        supportRequestId: supportRequest.supportRequestId,
        subject: supportRequest.subject,
        status: supportRequest.status,
        userUnreadNotificationCount: supportRequest.userUnreadNotificationCount,
        createdAt: supportRequest.createdAt,
        resolvedAt: supportRequest.resolvedAt ?? null,
        bookingRequest,
        // resolved fields
        messages: [],
    };
}
