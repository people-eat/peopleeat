import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitledOrNull } from '../../shared/textNormalize';
import { bookingRequestOffers, cooks, cookTestimonials } from '../db/schema';
import type { CookTestimonialCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookTestimonialCreateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

// Admin-created testimonials are always PUBLISHED — there is no self-reported
// rating to gate on (unlike `bookingRequestOfferTestimonialCreate`).
export async function adminCookTestimonialCreate(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationCookTestimonialCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [[cook], [offer]] = await Promise.all([
            serverRuntime.db.select({ cookId: cooks.cookId }).from(cooks).where(eq(cooks.cookId, input.cookId)).limit(1),
            input.bookingRequestOfferId
                ? serverRuntime.db
                      .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
                      .from(bookingRequestOffers)
                      .where(eq(bookingRequestOffers.bookingRequestOfferId, input.bookingRequestOfferId))
                      .limit(1)
                : Promise.resolve([]),
        ]);
        if (!cook) {
            throw new Error('adminCookTestimonialCreate: cook not found');
        }
        if (input.bookingRequestOfferId && !offer) {
            throw new Error('adminCookTestimonialCreate: booking request offer not found');
        }

        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: input.imageFileUploadIds ?? [],
            userId: adminId,
            commandName: 'adminCookTestimonialCreate',
        });

        const now = new Date();
        const cookTestimonialId = idCreate();
        const values: CookTestimonialCreate = {
            cookTestimonialId,
            userId: input.cookId,
            cookId: input.cookId,
            bookingRequestOfferId: input.bookingRequestOfferId ?? null,
            authorName: textNormalizeTitledOrNull(input.authorName),
            location: textNormalizeTitledOrNull(input.location),
            occasion: textNormalizeTitledOrNull(input.occasion),
            body: input.body == null ? null : textNormalizeProseTitled(input.body) || null,
            imageUrls,
            rating: input.rating ?? null,
            lowRatingAnswers: null,
            publicationStatus: 'PUBLISHED',
            publishedAt: now,
            createdAt: now,
        };

        await serverRuntime.db.insert(cookTestimonials).values(values);
        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: cookTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
