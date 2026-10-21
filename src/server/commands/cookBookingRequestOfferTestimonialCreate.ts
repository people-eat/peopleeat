import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitledOrNull } from '../../shared/textNormalize';
import { bookingRequestOffers, bookingRequests, cookTestimonials } from '../db/schema';
import type { CookTestimonialCreate } from '../db/schema';
import { bookingRequestOfferStatusDerive } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { CookTestimonialLowRatingAnswers } from '../domain/testimonial';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferTestimonialCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { publicationStatusFromRating } from '../utils/publicationStatusFromRating';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

/**
 * Cook's own testimonial about the platform experience for a completed
 * offer. Auto-publishes unless the rating is low (`rating <= 3` triggers
 * admin review — see `publicationStatusFromRating.ts`). Returns
 * `cookTestimonialId` as `referenceId`.
 */
export async function cookBookingRequestOfferTestimonialCreate(
    { cookId }: GqlSCookMutation,
    { input }: GqlSCookMutationBookingRequestOfferTestimonialCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

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
            throw new Error('cookBookingRequestOfferTestimonialCreate: offer not found');
        }

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
            throw new Error('cookBookingRequestOfferTestimonialCreate: offer is not completed yet');
        }

        const [existing] = await serverRuntime.db
            .select({ cookTestimonialId: cookTestimonials.cookTestimonialId })
            .from(cookTestimonials)
            .where(eq(cookTestimonials.bookingRequestOfferId, input.bookingRequestOfferId))
            .limit(1);
        if (existing) {
            throw new Error('cookBookingRequestOfferTestimonialCreate: testimonial already submitted for this offer');
        }

        if (input.rating != null && input.rating < 5 && !input.lowRatingAnswers) {
            throw new Error('cookBookingRequestOfferTestimonialCreate: lowRatingAnswers required when rating < 5');
        }

        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: input.imageFileUploadIds ?? [],
            userId: cookId,
            commandName: 'cookBookingRequestOfferTestimonialCreate',
        });

        const lowRatingAnswers: CookTestimonialLowRatingAnswers | null = input.lowRatingAnswers
            ? {
                  whatWentWrong: input.lowRatingAnswers.whatWentWrong?.trim() || undefined,
                  wouldRecommend: input.lowRatingAnswers.wouldRecommend ?? undefined,
                  additionalFeedback: input.lowRatingAnswers.additionalFeedback?.trim() || undefined,
              }
            : null;

        const publicationStatus = publicationStatusFromRating(input.rating);
        const now = new Date();
        const cookTestimonialId = idCreate();
        const values: CookTestimonialCreate = {
            cookTestimonialId,
            userId: cookId,
            cookId,
            bookingRequestOfferId: input.bookingRequestOfferId,
            authorName: textNormalizeTitledOrNull(input.authorName),
            location: textNormalizeTitledOrNull(input.location),
            occasion: textNormalizeTitledOrNull(input.occasion),
            body: input.body == null ? null : textNormalizeProseTitled(input.body) || null,
            imageUrls,
            rating: input.rating ?? null,
            lowRatingAnswers,
            publicationStatus,
            publishedAt: publicationStatus === 'PUBLISHED' ? now : null,
            createdAt: now,
        };

        await serverRuntime.db.insert(cookTestimonials).values(values);

        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: cookTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
