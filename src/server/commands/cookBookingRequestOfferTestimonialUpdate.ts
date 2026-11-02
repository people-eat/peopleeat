import { and, eq } from 'drizzle-orm';

import { testimonialRatingAssertRequired } from '../../shared/testimonialRating';
import { textNormalizeProseTitled } from '../../shared/textNormalize';
import { bookingRequestOffers, cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { CookTestimonialLowRatingAnswers } from '../domain/testimonial';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferTestimonialUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { publicationStatusFromRating } from '../utils/publicationStatusFromRating';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

/**
 * Full self-edit of the cook's offer-linked testimonial (body, rating, images).
 * Empty body clears the optional comment. Re-applies
 * `publicationStatusFromRating`. When `rating < 5`, `lowRatingAnswers` must be
 * provided or already present on the row. Returns `cookTestimonialId` as
 * `referenceId`.
 */
export async function cookBookingRequestOfferTestimonialUpdate(
    { cookId }: GqlSCookMutation,
    { input }: GqlSCookMutationBookingRequestOfferTestimonialUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const body = input.body == null ? null : textNormalizeProseTitled(input.body) || null;
    const rating = testimonialRatingAssertRequired(input.rating, 'cookBookingRequestOfferTestimonialUpdate');

    try {
        const [row] = await serverRuntime.db
            .select({
                cookTestimonialId: cookTestimonials.cookTestimonialId,
                lowRatingAnswers: cookTestimonials.lowRatingAnswers,
                publicationStatus: cookTestimonials.publicationStatus,
                publishedAt: cookTestimonials.publishedAt,
            })
            .from(cookTestimonials)
            .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, cookTestimonials.bookingRequestOfferId))
            .where(
                and(
                    eq(cookTestimonials.bookingRequestOfferId, input.bookingRequestOfferId),
                    eq(cookTestimonials.cookId, cookId),
                    eq(bookingRequestOffers.cookId, cookId),
                ),
            )
            .limit(1);
        if (!row) {
            throw new Error('cookBookingRequestOfferTestimonialUpdate: testimonial not found');
        }

        if (rating < 5 && !input.lowRatingAnswers && !row.lowRatingAnswers) {
            throw new Error('cookBookingRequestOfferTestimonialUpdate: lowRatingAnswers required when rating < 5');
        }

        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: input.imageFileUploadIds ?? [],
            userId: cookId,
            commandName: 'cookBookingRequestOfferTestimonialUpdate',
        });

        let lowRatingAnswers: CookTestimonialLowRatingAnswers | null = null;
        if (rating < 5) {
            if (input.lowRatingAnswers) {
                lowRatingAnswers = {
                    whatWentWrong: input.lowRatingAnswers.whatWentWrong?.trim() || undefined,
                    wouldRecommend: input.lowRatingAnswers.wouldRecommend ?? undefined,
                    additionalFeedback: input.lowRatingAnswers.additionalFeedback?.trim() || undefined,
                };
            } else {
                lowRatingAnswers = row.lowRatingAnswers;
            }
        }

        const publicationStatus = publicationStatusFromRating(rating);
        const now = new Date();
        const publishedAt = publicationStatus === 'PUBLISHED' ? (row.publicationStatus === 'PUBLISHED' ? row.publishedAt : now) : null;

        await serverRuntime.db
            .update(cookTestimonials)
            .set({ body, rating, imageUrls, lowRatingAnswers, publicationStatus, publishedAt })
            .where(eq(cookTestimonials.cookTestimonialId, row.cookTestimonialId));

        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: row.cookTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
