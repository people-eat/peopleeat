import type { SupportRequest } from '../db/schema';
import type { GqlSAdminSupportRequest, GqlSAdminUser, GqlSSupportRequestBookingRequestSummary } from '../graphql/generated';

export function toGqlAdminSupportRequest(
    supportRequest: SupportRequest,
    customer: GqlSAdminUser,
    bookingRequest: GqlSSupportRequestBookingRequestSummary | null,
): GqlSAdminSupportRequest {
    return {
        supportRequestId: supportRequest.supportRequestId,
        userId: supportRequest.userId,
        subject: supportRequest.subject,
        status: supportRequest.status,
        adminUnreadNotificationCount: supportRequest.adminUnreadNotificationCount,
        createdAt: supportRequest.createdAt,
        resolvedAt: supportRequest.resolvedAt ?? null,
        bookingRequest,
        customer,
        // resolved fields
        messages: [],
    };
}
