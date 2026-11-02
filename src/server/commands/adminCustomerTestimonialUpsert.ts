import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { testimonialRatingAssertRequired } from '../../shared/testimonialRating';
import { textNormalizeProseTitled, textNormalizeTitledOrNull } from '../../shared/textNormalize';
import { bookingRequestOffers, customerTestimonials, users } from '../db/schema';
import type { CustomerTestimonialCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationCustomerTestimonialUpsertArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

// Admin-created testimonials are always PUBLISHED — there is no self-reported
// rating to gate on (unlike `bookingRequestOfferTestimonialUpsert`).
export async function adminCustomerTestimonialUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationCustomerTestimonialUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const body = textNormalizeProseTitled(input.body);
    if (body.length === 0) {
        throw new Error('adminCustomerTestimonialUpsert: body must not be empty');
    }
    const rating = testimonialRatingAssertRequired(input.rating, 'adminCustomerTestimonialUpsert');
    const authorName = textNormalizeTitledOrNull(input.authorName);
    const location = textNormalizeTitledOrNull(input.location);
    const occasion = textNormalizeTitledOrNull(input.occasion);

    try {
        if (input.customerTestimonialId) {
            const set: Partial<CustomerTestimonialCreate> = {
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
                    commandName: 'adminCustomerTestimonialUpsert',
                });
            }

            const updated = await serverRuntime.db
                .update(customerTestimonials)
                .set(set)
                .where(eq(customerTestimonials.customerTestimonialId, input.customerTestimonialId))
                .returning({ customerTestimonialId: customerTestimonials.customerTestimonialId });
            if (updated.length === 0) {
                throw new Error('adminCustomerTestimonialUpsert: testimonial not found');
            }

            await serverRuntime.publish.adminUpdates();
            return { success: true, referenceId: input.customerTestimonialId };
        }

        const [[user], [offer]] = await Promise.all([
            serverRuntime.db.select({ userId: users.userId }).from(users).where(eq(users.userId, input.userId)).limit(1),
            input.bookingRequestOfferId
                ? serverRuntime.db
                      .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
                      .from(bookingRequestOffers)
                      .where(eq(bookingRequestOffers.bookingRequestOfferId, input.bookingRequestOfferId))
                      .limit(1)
                : Promise.resolve([]),
        ]);
        if (!user) {
            throw new Error('adminCustomerTestimonialUpsert: user not found');
        }
        if (input.bookingRequestOfferId && !offer) {
            throw new Error('adminCustomerTestimonialUpsert: booking request offer not found');
        }

        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: input.imageFileUploadIds ?? [],
            userId: adminId,
            commandName: 'adminCustomerTestimonialUpsert',
        });

        const now = new Date();
        const customerTestimonialId = idCreate();
        const values: CustomerTestimonialCreate = {
            customerTestimonialId,
            userId: input.userId,
            bookingRequestOfferId: input.bookingRequestOfferId ?? null,
            authorName,
            location,
            occasion,
            body,
            imageUrls,
            rating,
            publicationStatus: 'PUBLISHED',
            publishedAt: now,
            createdAt: now,
        };

        await serverRuntime.db.insert(customerTestimonials).values(values);
        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: customerTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
