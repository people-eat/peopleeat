import { inArray } from 'drizzle-orm';

import type { SupportRequest } from '../db/schema';
import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSupportRequestBookingRequestSummary } from '../graphql/generated';
import { toGqlSupportRequestBookingRequestSummary } from '../mappers/toGqlUserSupportRequest';

/** Batch-load booking summaries for support rows that have a booking link. */
export async function supportRequestBookingSummariesById(
    rows: ReadonlyArray<Pick<SupportRequest, 'bookingRequestId'>>,
    serverRuntime: ServerRuntime,
): Promise<Map<string, GqlSSupportRequestBookingRequestSummary>> {
    const bookingRequestIds = [...new Set(rows.map((row) => row.bookingRequestId).filter((id): id is string => id != null))];
    if (bookingRequestIds.length === 0) {
        return new Map();
    }

    const bookingRows = await serverRuntime.db
        .select({
            bookingRequestId: bookingRequests.bookingRequestId,
            occasion: bookingRequests.occasion,
            dateTime: bookingRequests.dateTime,
        })
        .from(bookingRequests)
        .where(inArray(bookingRequests.bookingRequestId, bookingRequestIds));

    return new Map(bookingRows.map((row) => [row.bookingRequestId, toGqlSupportRequestBookingRequestSummary(row)]));
}
