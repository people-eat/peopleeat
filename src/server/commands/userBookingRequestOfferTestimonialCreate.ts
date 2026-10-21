import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitledOrNull } from '../../shared/textNormalize';
import { bookingRequestOffers, bookingRequests, customerTestimonials } from '../db/schema';
import type { CustomerTestimonialCreate } from '../db/schema';
import { bookingRequestOfferStatusDerive } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferTestimonialCreateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { publicationStatusFromRating } from '../utils/publicationStatusFromRating';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

/**
 * Customer review of a completed offer. Auto-publishes unless the rating is
 * low (`publicationStatusFromRating`). Returns `customerTestimonialId` as
 * `referenceId`.
 */
export async function userBookingRequestOfferTestimonialCreate(
    { userId }: GqlSUserMutation,
    { input }: GqlSUserMutationBookingRequestOfferTestimonialCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const body = textNormalizeProseTitled(input.body);
    if (body.length === 0) {
        throw new Error('userBookingRequestOfferTestimonialCreate: body must not be empty');
    }

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequestOffers.bookingRequestOfferId, input.bookingRequestOfferId), eq(bookingRequests.userId, userId)))
            .limit(1);
        if (!row) {
            throw new Error('userBookingRequestOfferTestimonialCreate: offer not found');
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
            throw new Error('userBookingRequestOfferTestimonialCreate: offer is not completed yet');
        }

        const [existing] = await serverRuntime.db
            .select({ customerTestimonialId: customerTestimonials.customerTestimonialId })
            .from(customerTestimonials)
            .where(eq(customerTestimonials.bookingRequestOfferId, input.bookingRequestOfferId))
            .limit(1);
        if (existing) {
            throw new Error('userBookingRequestOfferTestimonialCreate: testimonial already submitted for this offer');
        }

        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: input.imageFileUploadIds ?? [],
            userId,
            commandName: 'userBookingRequestOfferTestimonialCreate',
        });

        const publicationStatus = publicationStatusFromRating(input.rating);
        const now = new Date();
        const customerTestimonialId = idCreate();
        const values: CustomerTestimonialCreate = {
            customerTestimonialId,
            userId,
            bookingRequestOfferId: input.bookingRequestOfferId,
            authorName: textNormalizeTitledOrNull(input.authorName),
            location: textNormalizeTitledOrNull(input.location),
            occasion: textNormalizeTitledOrNull(input.occasion),
            body,
            imageUrls,
            rating: input.rating ?? null,
            publicationStatus,
            publishedAt: publicationStatus === 'PUBLISHED' ? now : null,
            createdAt: now,
        };

        await serverRuntime.db.insert(customerTestimonials).values(values);

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: customerTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
