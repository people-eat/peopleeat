import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitledOrNull } from '../../shared/textNormalize';
import { bookingRequestOffers, customerTestimonials, users } from '../db/schema';
import type { CustomerTestimonialCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationCustomerTestimonialCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

// Admin-created testimonials are always PUBLISHED — there is no self-reported
// rating to gate on (unlike `bookingRequestOfferTestimonialCreate`).
export async function adminCustomerTestimonialCreate(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationCustomerTestimonialCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const body = textNormalizeProseTitled(input.body);
    if (body.length === 0) {
        throw new Error('adminCustomerTestimonialCreate: body must not be empty');
    }

    try {
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
            throw new Error('adminCustomerTestimonialCreate: user not found');
        }
        if (input.bookingRequestOfferId && !offer) {
            throw new Error('adminCustomerTestimonialCreate: booking request offer not found');
        }

        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: input.imageFileUploadIds ?? [],
            userId: adminId,
            commandName: 'adminCustomerTestimonialCreate',
        });

        const now = new Date();
        const customerTestimonialId = idCreate();
        const values: CustomerTestimonialCreate = {
            customerTestimonialId,
            userId: input.userId,
            bookingRequestOfferId: input.bookingRequestOfferId ?? null,
            authorName: textNormalizeTitledOrNull(input.authorName),
            location: textNormalizeTitledOrNull(input.location),
            occasion: textNormalizeTitledOrNull(input.occasion),
            body,
            imageUrls,
            rating: input.rating ?? null,
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
