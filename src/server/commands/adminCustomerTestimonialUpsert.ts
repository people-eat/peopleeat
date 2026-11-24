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
import { slackNotifyTestimonialUpserted } from '../slack/slackNotifyBooking';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

async function displayNameForUser(serverRuntime: ServerRuntime, userId: string, authorName: string | null): Promise<string> {
    if (authorName) {
        return authorName;
    }
    const [user] = await serverRuntime.db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
}

async function bookingRequestIdForOffer(serverRuntime: ServerRuntime, bookingRequestOfferId: string): Promise<string | undefined> {
    const [offer] = await serverRuntime.db
        .select({ bookingRequestId: bookingRequestOffers.bookingRequestId })
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
        .limit(1);
    return offer?.bookingRequestId;
}

// Admin-created testimonials are always PUBLISHED — there is no self-reported
// rating to gate on (unlike `bookingRequestOfferTestimonialUpsert`).
export async function adminCustomerTestimonialUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationCustomerTestimonialUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

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
            const [existing] = await serverRuntime.db
                .select({
                    customerTestimonialId: customerTestimonials.customerTestimonialId,
                    bookingRequestOfferId: customerTestimonials.bookingRequestOfferId,
                    imageUrls: customerTestimonials.imageUrls,
                    userId: customerTestimonials.userId,
                })
                .from(customerTestimonials)
                .where(eq(customerTestimonials.customerTestimonialId, input.customerTestimonialId))
                .limit(1);
            if (!existing) {
                throw new Error('adminCustomerTestimonialUpsert: testimonial not found');
            }

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

            await serverRuntime.db
                .update(customerTestimonials)
                .set(set)
                .where(eq(customerTestimonials.customerTestimonialId, input.customerTestimonialId));

            await serverRuntime.publish.adminUpdates();

            if (existing.bookingRequestOfferId) {
                const bookingRequestId = await bookingRequestIdForOffer(serverRuntime, existing.bookingRequestOfferId);
                if (bookingRequestId) {
                    const imageCount = set.imageUrls?.length ?? existing.imageUrls?.length ?? 0;
                    await slackNotifyTestimonialUpserted(serverRuntime, {
                        bookingRequestId,
                        bookingRequestOfferId: existing.bookingRequestOfferId,
                        audience: 'CUSTOMER',
                        action: 'UPDATED',
                        viaAdmin: true,
                        authorName: await displayNameForUser(serverRuntime, existing.userId, authorName),
                        rating,
                        body,
                        imageCount,
                    });
                }
            }

            return { success: true, referenceId: input.customerTestimonialId };
        }

        const [[user], [offer]] = await Promise.all([
            serverRuntime.db
                .select({ userId: users.userId, firstName: users.firstName, lastName: users.lastName })
                .from(users)
                .where(eq(users.userId, input.userId))
                .limit(1),
            input.bookingRequestOfferId
                ? serverRuntime.db
                      .select({
                          bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                          bookingRequestId: bookingRequestOffers.bookingRequestId,
                      })
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

        if (offer) {
            await slackNotifyTestimonialUpserted(serverRuntime, {
                bookingRequestId: offer.bookingRequestId,
                bookingRequestOfferId: offer.bookingRequestOfferId,
                audience: 'CUSTOMER',
                action: 'CREATED',
                viaAdmin: true,
                authorName: authorName ?? `${user.firstName} ${user.lastName}`,
                rating,
                body,
                imageCount: imageUrls.length,
            });
        }

        return { success: true, referenceId: customerTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
