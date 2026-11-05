import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { testimonialRatingAssertRequired } from '../../shared/testimonialRating';
import { textNormalizeProseTitled } from '../../shared/textNormalize';
import { bookingRequestOffers, bookingRequests, cookTestimonials } from '../db/schema';
import type { CookTestimonialCreate } from '../db/schema';
import { bookingRequestOfferStatusDerive } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { CookTestimonialLowRatingAnswers } from '../domain/testimonial';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferTestimonialUpsertArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';
import { publicationStatusFromRating } from '../utils/publicationStatusFromRating';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

/**
 * Cook testimonial upsert for a completed offer. Inserts when missing
 * (requires `COMPLETED`); otherwise full self-edit of body, rating, and
 * images. Empty body clears the optional comment. Re-applies
 * `publicationStatusFromRating`. When `rating < 5`, `lowRatingAnswers` must be
 * provided on insert, or provided/already present on update. Returns
 * `cookTestimonialId` as `referenceId`.
 */
export async function cookBookingRequestOfferTestimonialUpsert(
    { cookId }: GqlSCookMutation,
    { input }: GqlSCookMutationBookingRequestOfferTestimonialUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferTestimonialUpsert');

    const body = input.body == null ? null : textNormalizeProseTitled(input.body) || null;
    const rating = testimonialRatingAssertRequired(input.rating, 'cookBookingRequestOfferTestimonialUpsert');

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(
                and(eq(bookingRequestOffers.bookingRequestOfferId, input.bookingRequestOfferId), eq(bookingRequestOffers.cookId, cookId)),
            )
            .limit(1);
        if (!row) {
            throw new Error('cookBookingRequestOfferTestimonialUpsert: offer not found');
        }

        const [existing] = await serverRuntime.db
            .select({
                cookTestimonialId: cookTestimonials.cookTestimonialId,
                lowRatingAnswers: cookTestimonials.lowRatingAnswers,
                publicationStatus: cookTestimonials.publicationStatus,
                publishedAt: cookTestimonials.publishedAt,
            })
            .from(cookTestimonials)
            .where(eq(cookTestimonials.bookingRequestOfferId, input.bookingRequestOfferId))
            .limit(1);

        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: input.imageFileUploadIds ?? [],
            userId: cookId,
            commandName: 'cookBookingRequestOfferTestimonialUpsert',
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
                throw new Error('cookBookingRequestOfferTestimonialUpsert: offer is not completed yet');
            }
            if (rating < 5 && !input.lowRatingAnswers) {
                throw new Error('cookBookingRequestOfferTestimonialUpsert: lowRatingAnswers required when rating < 5');
            }

            const lowRatingAnswers: CookTestimonialLowRatingAnswers | null = input.lowRatingAnswers
                ? {
                      whatWentWrong: input.lowRatingAnswers.whatWentWrong?.trim() || undefined,
                      wouldRecommend: input.lowRatingAnswers.wouldRecommend ?? undefined,
                      additionalFeedback: input.lowRatingAnswers.additionalFeedback?.trim() || undefined,
                  }
                : null;

            const cookTestimonialId = idCreate();
            const values: CookTestimonialCreate = {
                cookTestimonialId,
                userId: cookId,
                cookId,
                bookingRequestOfferId: input.bookingRequestOfferId,
                authorName: null,
                location: null,
                occasion: null,
                body,
                imageUrls,
                rating,
                lowRatingAnswers,
                publicationStatus,
                publishedAt: publicationStatus === 'PUBLISHED' ? now : null,
                createdAt: now,
            };

            await serverRuntime.db.insert(cookTestimonials).values(values);
            await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
            return { success: true, referenceId: cookTestimonialId };
        }

        if (rating < 5 && !input.lowRatingAnswers && !existing.lowRatingAnswers) {
            throw new Error('cookBookingRequestOfferTestimonialUpsert: lowRatingAnswers required when rating < 5');
        }

        let lowRatingAnswers: CookTestimonialLowRatingAnswers | null = null;
        if (rating < 5) {
            if (input.lowRatingAnswers) {
                lowRatingAnswers = {
                    whatWentWrong: input.lowRatingAnswers.whatWentWrong?.trim() || undefined,
                    wouldRecommend: input.lowRatingAnswers.wouldRecommend ?? undefined,
                    additionalFeedback: input.lowRatingAnswers.additionalFeedback?.trim() || undefined,
                };
            } else {
                lowRatingAnswers = existing.lowRatingAnswers;
            }
        }

        const publishedAt =
            publicationStatus === 'PUBLISHED' ? (existing.publicationStatus === 'PUBLISHED' ? existing.publishedAt : now) : null;

        await serverRuntime.db
            .update(cookTestimonials)
            .set({ body, rating, imageUrls, lowRatingAnswers, publicationStatus, publishedAt })
            .where(eq(cookTestimonials.cookTestimonialId, existing.cookTestimonialId));

        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: existing.cookTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
