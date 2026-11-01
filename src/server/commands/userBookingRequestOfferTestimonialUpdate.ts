import { and, eq } from 'drizzle-orm';

import { textNormalizeProseTitled } from '../../shared/textNormalize';
import { bookingRequestOffers, bookingRequests, customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferTestimonialUpdateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { publicationStatusFromRating } from '../utils/publicationStatusFromRating';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

/**
 * Full self-edit of the customer's offer-linked testimonial (body, rating,
 * images). Re-applies `publicationStatusFromRating` so a drop to <= 3 goes
 * back to admin review. Returns `customerTestimonialId` as `referenceId`.
 */
export async function userBookingRequestOfferTestimonialUpdate(
    { userId }: GqlSUserMutation,
    { input }: GqlSUserMutationBookingRequestOfferTestimonialUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const body = textNormalizeProseTitled(input.body);
    if (body.length === 0) {
        throw new Error('userBookingRequestOfferTestimonialUpdate: body must not be empty');
    }

    try {
        const [row] = await serverRuntime.db
            .select({
                customerTestimonialId: customerTestimonials.customerTestimonialId,
                publicationStatus: customerTestimonials.publicationStatus,
                publishedAt: customerTestimonials.publishedAt,
            })
            .from(customerTestimonials)
            .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, customerTestimonials.bookingRequestOfferId))
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(
                and(
                    eq(customerTestimonials.bookingRequestOfferId, input.bookingRequestOfferId),
                    eq(customerTestimonials.userId, userId),
                    eq(bookingRequests.userId, userId),
                ),
            )
            .limit(1);
        if (!row) {
            throw new Error('userBookingRequestOfferTestimonialUpdate: testimonial not found');
        }

        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: input.imageFileUploadIds ?? [],
            userId,
            commandName: 'userBookingRequestOfferTestimonialUpdate',
        });

        const rating = input.rating ?? null;
        const publicationStatus = publicationStatusFromRating(rating);
        const now = new Date();
        const publishedAt = publicationStatus === 'PUBLISHED' ? (row.publicationStatus === 'PUBLISHED' ? row.publishedAt : now) : null;

        await serverRuntime.db
            .update(customerTestimonials)
            .set({ body, rating, imageUrls, publicationStatus, publishedAt })
            .where(eq(customerTestimonials.customerTestimonialId, row.customerTestimonialId));

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: row.customerTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
