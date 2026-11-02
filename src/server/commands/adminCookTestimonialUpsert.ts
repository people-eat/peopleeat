import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { testimonialRatingAssertRequired } from '../../shared/testimonialRating';
import { textNormalizeProseTitled, textNormalizeTitledOrNull } from '../../shared/textNormalize';
import { bookingRequestOffers, cooks, cookTestimonials } from '../db/schema';
import type { CookTestimonialCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookTestimonialUpsertArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

// Admin-created testimonials are always PUBLISHED — there is no self-reported
// rating to gate on (unlike `bookingRequestOfferTestimonialCreate`). `cookId`
// equals `Users.userId` for cooks.
export async function adminCookTestimonialUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationCookTestimonialUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const rating = testimonialRatingAssertRequired(input.rating, 'adminCookTestimonialUpsert');
    const authorName = textNormalizeTitledOrNull(input.authorName);
    const location = textNormalizeTitledOrNull(input.location);
    const occasion = textNormalizeTitledOrNull(input.occasion);
    const body = input.body == null ? null : textNormalizeProseTitled(input.body) || null;

    try {
        if (input.cookTestimonialId) {
            const set: Partial<CookTestimonialCreate> = {
                authorName,
                location,
                occasion,
                body,
                rating,
            };
            if (input.imageFileUploadIds !== undefined && input.imageFileUploadIds !== null) {
                set.imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
                    fileUploadIds: input.imageFileUploadIds,
                    userId: adminId,
                    commandName: 'adminCookTestimonialUpsert',
                });
            }

            const updated = await serverRuntime.db
                .update(cookTestimonials)
                .set(set)
                .where(eq(cookTestimonials.cookTestimonialId, input.cookTestimonialId))
                .returning({ cookTestimonialId: cookTestimonials.cookTestimonialId });
            if (updated.length === 0) {
                throw new Error('adminCookTestimonialUpsert: testimonial not found');
            }

            await serverRuntime.publish.adminUpdates();
            return { success: true, referenceId: input.cookTestimonialId };
        }

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
            throw new Error('adminCookTestimonialUpsert: cook not found');
        }
        if (input.bookingRequestOfferId && !offer) {
            throw new Error('adminCookTestimonialUpsert: booking request offer not found');
        }

        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: input.imageFileUploadIds ?? [],
            userId: adminId,
            commandName: 'adminCookTestimonialUpsert',
        });

        const now = new Date();
        const cookTestimonialId = idCreate();
        const values: CookTestimonialCreate = {
            cookTestimonialId,
            userId: input.cookId,
            cookId: input.cookId,
            bookingRequestOfferId: input.bookingRequestOfferId ?? null,
            authorName,
            location,
            occasion,
            body,
            imageUrls,
            rating,
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
