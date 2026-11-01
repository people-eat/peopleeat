import { and, eq } from 'drizzle-orm';

import { textNormalizeProseTitled } from '../../shared/textNormalize';
import { bookingRequestOffers, cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferTestimonialUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

/**
 * Body-only self-edit of the cook's offer-linked testimonial. Empty body
 * clears the optional comment. Does not change rating, images, or
 * publicationStatus. Returns `cookTestimonialId` as `referenceId`.
 */
export async function cookBookingRequestOfferTestimonialUpdate(
    { cookId }: GqlSCookMutation,
    { input }: GqlSCookMutationBookingRequestOfferTestimonialUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const body = input.body == null ? null : textNormalizeProseTitled(input.body) || null;

    try {
        const [row] = await serverRuntime.db
            .select({
                cookTestimonialId: cookTestimonials.cookTestimonialId,
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

        await serverRuntime.db.update(cookTestimonials).set({ body }).where(eq(cookTestimonials.cookTestimonialId, row.cookTestimonialId));

        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: row.cookTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
