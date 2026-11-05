import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { testimonialRatingAssertRequired } from '../../shared/testimonialRating';
import { textNormalizeProseTitled } from '../../shared/textNormalize';
import { bookingRequestOffers, bookingRequests, customerTestimonials } from '../db/schema';
import type { CustomerTestimonialCreate } from '../db/schema';
import { bookingRequestOfferStatusDerive } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferTestimonialUpsertArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';
import { publicationStatusFromRating } from '../utils/publicationStatusFromRating';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

/**
 * Customer review upsert for a completed offer. Inserts when missing (requires
 * `COMPLETED`); otherwise full self-edit of body, rating, and images.
 * Re-applies `publicationStatusFromRating`. Returns `customerTestimonialId` as
 * `referenceId`.
 */
export async function userBookingRequestOfferTestimonialUpsert(
    { userId }: GqlSUserMutation,
    { input }: GqlSUserMutationBookingRequestOfferTestimonialUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'userBookingRequestOfferTestimonialUpsert');

    const body = textNormalizeProseTitled(input.body);
    if (body.length === 0) {
        throw new Error('userBookingRequestOfferTestimonialUpsert: body must not be empty');
    }
    const rating = testimonialRatingAssertRequired(input.rating, 'userBookingRequestOfferTestimonialUpsert');

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequestOffers.bookingRequestOfferId, input.bookingRequestOfferId), eq(bookingRequests.userId, userId)))
            .limit(1);
        if (!row) {
            throw new Error('userBookingRequestOfferTestimonialUpsert: offer not found');
        }

        const [existing] = await serverRuntime.db
            .select({
                customerTestimonialId: customerTestimonials.customerTestimonialId,
                publicationStatus: customerTestimonials.publicationStatus,
                publishedAt: customerTestimonials.publishedAt,
            })
            .from(customerTestimonials)
            .where(eq(customerTestimonials.bookingRequestOfferId, input.bookingRequestOfferId))
            .limit(1);

        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: input.imageFileUploadIds ?? [],
            userId,
            commandName: 'userBookingRequestOfferTestimonialUpsert',
        });

        const publicationStatus = publicationStatusFromRating(rating);
        const now = new Date();

        if (!existing) {
            const status = bookingRequestOfferStatusDerive({
                userAccepted: row.offer.userAccepted ?? null,
                cookAccepted: row.offer.cookAccepted ?? null,
                userRequestedMenuAdjustments: row.offer.userRequestedMenuAdjustments ?? null,
                paymentStatus: row.offer.paymentStatus,
                paymentDataPresent: Boolean(row.offer.paymentData),
                bookingRequestCanceledAt: row.bookingRequest.canceledAt,
                bookingRequestExpiresAt: row.bookingRequest.expiresAt,
                bookingRequestDateTime: row.bookingRequest.dateTime,
                hasAcceptedAlternative: false,
            });
            if (status !== 'COMPLETED') {
                throw new Error('userBookingRequestOfferTestimonialUpsert: offer is not completed yet');
            }

            const customerTestimonialId = idCreate();
            const values: CustomerTestimonialCreate = {
                customerTestimonialId,
                userId,
                bookingRequestOfferId: input.bookingRequestOfferId,
                authorName: null,
                location: null,
                occasion: null,
                body,
                imageUrls,
                rating,
                publicationStatus,
                publishedAt: publicationStatus === 'PUBLISHED' ? now : null,
                createdAt: now,
            };

            await serverRuntime.db.insert(customerTestimonials).values(values);
            await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
            return { success: true, referenceId: customerTestimonialId };
        }

        const publishedAt =
            publicationStatus === 'PUBLISHED' ? (existing.publicationStatus === 'PUBLISHED' ? existing.publishedAt : now) : null;

        await serverRuntime.db
            .update(customerTestimonials)
            .set({ body, rating, imageUrls, publicationStatus, publishedAt })
            .where(eq(customerTestimonials.customerTestimonialId, existing.customerTestimonialId));

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: existing.customerTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
