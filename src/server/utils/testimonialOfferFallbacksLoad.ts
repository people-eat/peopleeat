import { eq, inArray } from 'drizzle-orm';

import type { Database, DatabaseTransaction } from '../db';
import { bookingRequestOffers, bookingRequests, users } from '../db/schema';

export type TestimonialOfferFallbacks = {
    authorName: string;
    /** City only — never the full event address. */
    location: string | null;
    occasion: string | null;
};

/**
 * Batch-loads the author-name / location / occasion fallback shown when a
 * testimonial's own free-text fields are empty. `role: 'customer'` resolves
 * the author to the booking request's owner (the reviewer); `role: 'cook'`
 * resolves it to the offer's cook (the platform-experience author). Location
 * always falls back to the booking request's event city — never the full
 * street address.
 */
export async function testimonialOfferFallbacksLoad(
    db: Database | DatabaseTransaction,
    bookingRequestOfferIds: string[],
    role: 'customer' | 'cook',
): Promise<Map<string, TestimonialOfferFallbacks>> {
    const result = new Map<string, TestimonialOfferFallbacks>();
    const uniqueOfferIds = [...new Set(bookingRequestOfferIds)];
    if (uniqueOfferIds.length === 0) return result;

    const rows = await db
        .select({
            bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
            cookId: bookingRequestOffers.cookId,
            customerId: bookingRequests.userId,
            occasion: bookingRequests.occasion,
            city: bookingRequests.exactEventAddress,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .where(inArray(bookingRequestOffers.bookingRequestOfferId, uniqueOfferIds));

    if (rows.length === 0) return result;

    const authorUserIds = [...new Set(rows.map((row) => (role === 'cook' ? row.cookId : row.customerId)))];
    const authorRows = await db
        .select({ userId: users.userId, firstName: users.firstName })
        .from(users)
        .where(inArray(users.userId, authorUserIds));
    const firstNameByUserId = new Map(authorRows.map((row) => [row.userId, row.firstName]));

    for (const row of rows) {
        const authorUserId = role === 'cook' ? row.cookId : row.customerId;
        result.set(row.bookingRequestOfferId, {
            authorName: firstNameByUserId.get(authorUserId) ?? '',
            location: row.city.city || null,
            occasion: row.occasion || null,
        });
    }

    return result;
}
