import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { testimonialRatingAssertRequired } from '../../shared/testimonialRating';
import { textNormalizeProseTitled, textNormalizeTitledOrNull } from '../../shared/textNormalize';
import { bookingRequestOffers, cooks, cookTestimonials, users } from '../db/schema';
import type { CookTestimonialCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookTestimonialUpsertArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyTestimonialUpserted } from '../slack/slackNotifyBooking';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

async function displayNameForCook(serverRuntime: ServerRuntime, cookId: string, authorName: string | null): Promise<string> {
    if (authorName) {
        return authorName;
    }
    const [user] = await serverRuntime.db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.userId, cookId))
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
// rating to gate on (unlike `bookingRequestOfferTestimonialUpsert`). `cookId`
// equals `Users.userId` for cooks.
export async function adminCookTestimonialUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationCookTestimonialUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    const rating = testimonialRatingAssertRequired(input.rating, 'adminCookTestimonialUpsert');
    const authorName = textNormalizeTitledOrNull(input.authorName);
    const location = textNormalizeTitledOrNull(input.location);
    const occasion = textNormalizeTitledOrNull(input.occasion);
    const body = input.body == null ? null : textNormalizeProseTitled(input.body) || null;

    try {
        if (input.cookTestimonialId) {
            const [existing] = await serverRuntime.db
                .select({
                    cookTestimonialId: cookTestimonials.cookTestimonialId,
                    bookingRequestOfferId: cookTestimonials.bookingRequestOfferId,
                    imageUrls: cookTestimonials.imageUrls,
                    cookId: cookTestimonials.cookId,
                })
                .from(cookTestimonials)
                .where(eq(cookTestimonials.cookTestimonialId, input.cookTestimonialId))
                .limit(1);
            if (!existing) {
                throw new Error('adminCookTestimonialUpsert: testimonial not found');
            }

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

            await serverRuntime.db.update(cookTestimonials).set(set).where(eq(cookTestimonials.cookTestimonialId, input.cookTestimonialId));

            await serverRuntime.publish.adminUpdates();

            if (existing.bookingRequestOfferId) {
                const bookingRequestId = await bookingRequestIdForOffer(serverRuntime, existing.bookingRequestOfferId);
                if (bookingRequestId) {
                    const imageCount = set.imageUrls?.length ?? existing.imageUrls?.length ?? 0;
                    await slackNotifyTestimonialUpserted(serverRuntime, {
                        bookingRequestId,
                        bookingRequestOfferId: existing.bookingRequestOfferId,
                        audience: 'COOK',
                        action: 'UPDATED',
                        viaAdmin: true,
                        authorName: await displayNameForCook(serverRuntime, existing.cookId, authorName),
                        rating,
                        body,
                        imageCount,
                    });
                }
            }

            return { success: true, referenceId: input.cookTestimonialId };
        }

        const [[cook], [offer]] = await Promise.all([
            serverRuntime.db
                .select({ cookId: cooks.cookId, firstName: users.firstName, lastName: users.lastName })
                .from(cooks)
                .innerJoin(users, eq(users.userId, cooks.cookId))
                .where(eq(cooks.cookId, input.cookId))
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

        if (offer) {
            await slackNotifyTestimonialUpserted(serverRuntime, {
                bookingRequestId: offer.bookingRequestId,
                bookingRequestOfferId: offer.bookingRequestOfferId,
                audience: 'COOK',
                action: 'CREATED',
                viaAdmin: true,
                authorName: authorName ?? `${cook.firstName} ${cook.lastName}`,
                rating,
                body,
                imageCount: imageUrls.length,
            });
        }

        return { success: true, referenceId: cookTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
