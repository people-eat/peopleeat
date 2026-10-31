import { and, eq, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';

import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { Database } from '../db';
import {
    admins,
    blogPosts,
    bookingRequestOfferEventAttachments,
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequests,
    cities,
    cooks,
    cookTestimonials,
    customerTestimonials,
    giftCards,
    meals,
    occasions,
    outboundEmailAttachments,
    partners,
    supportRequestMessageAttachments,
    supportRequestMessages,
    supportRequests,
    users,
    whatsAppMessageAttachments,
} from '../db/schema';

/** JSONB array containment for `/api/file-uploads/{id}` stored on testimonial `imageUrls`. */
function testimonialImageUrlsContain(
    imageUrlsColumn: typeof customerTestimonials.imageUrls | typeof cookTestimonials.imageUrls,
    fileUploadId: string,
) {
    const url = fileUploadPublicUrl(fileUploadId);
    return sql`exists (
        select 1
        from jsonb_array_elements_text(coalesce(${imageUrlsColumn}, '[]'::jsonb)) as u(url)
        where u.url = ${url}
    )`;
}

/** True when a published content page references this upload as hero or section image. */
export async function fileUploadReferencedByPublishedContent(db: Database, fileUploadId: string): Promise<boolean> {
    const now = new Date();
    const published = and(isNotNull(cities.publishedAt), lte(cities.publishedAt, now));

    const [cityHit] = await db
        .select({ cityId: cities.cityId })
        .from(cities)
        .where(
            and(
                published,
                or(
                    eq(cities.heroImageFileUploadId, fileUploadId),
                    eq(cities.firstSectionImageFileUploadId, fileUploadId),
                    sql`exists (
                        select 1 from jsonb_array_elements(${cities.sections}) as s
                        where s->>'imageFileUploadId' = ${fileUploadId}
                    )`,
                ),
            ),
        )
        .limit(1);
    if (cityHit) return true;

    const [partnerHit] = await db
        .select({ partnerId: partners.partnerId })
        .from(partners)
        .where(
            and(
                isNotNull(partners.publishedAt),
                lte(partners.publishedAt, now),
                or(
                    eq(partners.heroImageFileUploadId, fileUploadId),
                    eq(partners.firstSectionImageFileUploadId, fileUploadId),
                    sql`exists (
                        select 1 from jsonb_array_elements(${partners.sections}) as s
                        where s->>'imageFileUploadId' = ${fileUploadId}
                    )`,
                ),
            ),
        )
        .limit(1);
    if (partnerHit) return true;

    const [occasionHit] = await db
        .select({ occasionId: occasions.occasionId })
        .from(occasions)
        .where(
            and(
                isNotNull(occasions.publishedAt),
                lte(occasions.publishedAt, now),
                or(
                    eq(occasions.heroImageFileUploadId, fileUploadId),
                    eq(occasions.firstSectionImageFileUploadId, fileUploadId),
                    sql`exists (
                        select 1 from jsonb_array_elements(${occasions.sections}) as s
                        where s->>'imageFileUploadId' = ${fileUploadId}
                    )`,
                    sql`exists (
                        select 1 from jsonb_array_elements(${occasions.formatsSection}->'cards') as c
                        where c->>'imageFileUploadId' = ${fileUploadId}
                    )`,
                ),
            ),
        )
        .limit(1);
    if (occasionHit) return true;

    const [blogHit] = await db
        .select({ blogPostId: blogPosts.blogPostId })
        .from(blogPosts)
        .where(
            and(
                isNotNull(blogPosts.publishedAt),
                lte(blogPosts.publishedAt, now),
                or(
                    eq(blogPosts.heroImageFileUploadId, fileUploadId),
                    sql`exists (
                        select 1 from jsonb_array_elements(${blogPosts.sections}) as s
                        where s->>'imageFileUploadId' = ${fileUploadId}
                    )`,
                ),
            ),
        )
        .limit(1);
    return Boolean(blogHit);
}

/** True when any content page (draft or published) references this upload. */
export async function fileUploadReferencedByAnyContent(db: Database, fileUploadId: string): Promise<boolean> {
    const [cityHit] = await db
        .select({ cityId: cities.cityId })
        .from(cities)
        .where(
            or(
                eq(cities.heroImageFileUploadId, fileUploadId),
                eq(cities.firstSectionImageFileUploadId, fileUploadId),
                sql`exists (
                    select 1 from jsonb_array_elements(${cities.sections}) as s
                    where s->>'imageFileUploadId' = ${fileUploadId}
                )`,
            ),
        )
        .limit(1);
    if (cityHit) return true;

    const [partnerHit] = await db
        .select({ partnerId: partners.partnerId })
        .from(partners)
        .where(
            or(
                eq(partners.heroImageFileUploadId, fileUploadId),
                eq(partners.firstSectionImageFileUploadId, fileUploadId),
                sql`exists (
                    select 1 from jsonb_array_elements(${partners.sections}) as s
                    where s->>'imageFileUploadId' = ${fileUploadId}
                )`,
            ),
        )
        .limit(1);
    if (partnerHit) return true;

    const [occasionHit] = await db
        .select({ occasionId: occasions.occasionId })
        .from(occasions)
        .where(
            or(
                eq(occasions.heroImageFileUploadId, fileUploadId),
                eq(occasions.firstSectionImageFileUploadId, fileUploadId),
                sql`exists (
                    select 1 from jsonb_array_elements(${occasions.sections}) as s
                    where s->>'imageFileUploadId' = ${fileUploadId}
                )`,
                sql`exists (
                    select 1 from jsonb_array_elements(${occasions.formatsSection}->'cards') as c
                    where c->>'imageFileUploadId' = ${fileUploadId}
                )`,
            ),
        )
        .limit(1);
    if (occasionHit) return true;

    const [blogHit] = await db
        .select({ blogPostId: blogPosts.blogPostId })
        .from(blogPosts)
        .where(
            or(
                eq(blogPosts.heroImageFileUploadId, fileUploadId),
                sql`exists (
                    select 1 from jsonb_array_elements(${blogPosts.sections}) as s
                    where s->>'imageFileUploadId' = ${fileUploadId}
                )`,
            ),
        )
        .limit(1);
    return Boolean(blogHit);
}

/** True when any user currently points at this upload as their profile picture. */
export async function fileUploadReferencedAsProfilePicture(db: Database, fileUploadId: string): Promise<boolean> {
    const [hit] = await db.select({ userId: users.userId }).from(users).where(eq(users.profilePictureFileUploadId, fileUploadId)).limit(1);
    return Boolean(hit);
}

/** True when any cook currently points at this upload as their public brand mark. */
export async function fileUploadReferencedAsCookLogo(db: Database, fileUploadId: string): Promise<boolean> {
    const [hit] = await db.select({ cookId: cooks.cookId }).from(cooks).where(eq(cooks.logoFileUploadId, fileUploadId)).limit(1);
    return Boolean(hit);
}

/** True when a gift card stores this upload as its receipt or voucher PDF. */
export async function fileUploadReferencedByGiftCardPdf(db: Database, fileUploadId: string): Promise<boolean> {
    const [hit] = await db
        .select({ giftCardId: giftCards.giftCardId })
        .from(giftCards)
        .where(or(eq(giftCards.invoiceFileUploadId, fileUploadId), eq(giftCards.voucherFileUploadId, fileUploadId)))
        .limit(1);
    return Boolean(hit);
}

/** True when an outbound email lists this upload as an attachment. */
export async function fileUploadReferencedByOutboundEmailAttachment(db: Database, fileUploadId: string): Promise<boolean> {
    const [hit] = await db
        .select({ outboundEmailId: outboundEmailAttachments.outboundEmailId })
        .from(outboundEmailAttachments)
        .where(eq(outboundEmailAttachments.fileUploadId, fileUploadId))
        .limit(1);
    return Boolean(hit);
}

/** True when a WhatsApp Concierge message attaches this upload. */
export async function fileUploadReferencedByWhatsAppAttachment(db: Database, fileUploadId: string): Promise<boolean> {
    const [hit] = await db
        .select({ whatsAppMessageId: whatsAppMessageAttachments.whatsAppMessageId })
        .from(whatsAppMessageAttachments)
        .where(eq(whatsAppMessageAttachments.fileUploadId, fileUploadId))
        .limit(1);
    return Boolean(hit);
}

/** True when a published customer or cook testimonial lists this upload in `imageUrls`. */
export async function fileUploadReferencedByPublishedTestimonial(db: Database, fileUploadId: string): Promise<boolean> {
    const [customerHit] = await db
        .select({ customerTestimonialId: customerTestimonials.customerTestimonialId })
        .from(customerTestimonials)
        .where(
            and(
                eq(customerTestimonials.publicationStatus, 'PUBLISHED'),
                testimonialImageUrlsContain(customerTestimonials.imageUrls, fileUploadId),
            ),
        )
        .limit(1);
    if (customerHit) return true;

    const [cookHit] = await db
        .select({ cookTestimonialId: cookTestimonials.cookTestimonialId })
        .from(cookTestimonials)
        .where(
            and(eq(cookTestimonials.publicationStatus, 'PUBLISHED'), testimonialImageUrlsContain(cookTestimonials.imageUrls, fileUploadId)),
        )
        .limit(1);
    return Boolean(cookHit);
}

/** True when any customer or cook testimonial (including pending review) lists this upload in `imageUrls`. */
export async function fileUploadReferencedByAnyTestimonial(db: Database, fileUploadId: string): Promise<boolean> {
    const [customerHit] = await db
        .select({ customerTestimonialId: customerTestimonials.customerTestimonialId })
        .from(customerTestimonials)
        .where(testimonialImageUrlsContain(customerTestimonials.imageUrls, fileUploadId))
        .limit(1);
    if (customerHit) return true;

    const [cookHit] = await db
        .select({ cookTestimonialId: cookTestimonials.cookTestimonialId })
        .from(cookTestimonials)
        .where(testimonialImageUrlsContain(cookTestimonials.imageUrls, fileUploadId))
        .limit(1);
    return Boolean(cookHit);
}

/** True when a published, non-deleted meal references this upload as its image. */
export async function fileUploadReferencedByPublishedMeal(db: Database, fileUploadId: string): Promise<boolean> {
    const now = new Date();
    const [hit] = await db
        .select({ mealId: meals.mealId })
        .from(meals)
        .where(
            and(
                eq(meals.imageFileUploadId, fileUploadId),
                isNotNull(meals.publishedAt),
                lte(meals.publishedAt, now),
                isNull(meals.deletedAt),
            ),
        )
        .limit(1);
    return Boolean(hit);
}

/** True when any meal (draft, published, or soft-deleted) references this upload. */
export async function fileUploadReferencedByAnyMeal(db: Database, fileUploadId: string): Promise<boolean> {
    const [hit] = await db.select({ mealId: meals.mealId }).from(meals).where(eq(meals.imageFileUploadId, fileUploadId)).limit(1);
    return Boolean(hit);
}

/**
 * True when `userId` may download this upload because it is attached to an offer
 * chat they can see (customer, cook, or admin).
 */
export async function fileUploadAccessibleViaOfferChat(db: Database, fileUploadId: string, userId: string): Promise<boolean> {
    if (await userIsAdmin(db, userId)) {
        const [hit] = await db
            .select({ bookingRequestOfferEventId: bookingRequestOfferEventAttachments.bookingRequestOfferEventId })
            .from(bookingRequestOfferEventAttachments)
            .where(eq(bookingRequestOfferEventAttachments.fileUploadId, fileUploadId))
            .limit(1);
        return Boolean(hit);
    }

    const [hit] = await db
        .select({ bookingRequestOfferEventId: bookingRequestOfferEventAttachments.bookingRequestOfferEventId })
        .from(bookingRequestOfferEventAttachments)
        .innerJoin(
            bookingRequestOfferEvents,
            eq(bookingRequestOfferEvents.bookingRequestOfferEventId, bookingRequestOfferEventAttachments.bookingRequestOfferEventId),
        )
        .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferEvents.bookingRequestOfferId))
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .where(
            and(
                eq(bookingRequestOfferEventAttachments.fileUploadId, fileUploadId),
                or(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.cookId, userId)),
            ),
        )
        .limit(1);
    return Boolean(hit);
}

/**
 * True when `userId` may download this upload because it is attached to a
 * support request they can see (owning customer or any admin).
 */
export async function fileUploadAccessibleViaSupportRequest(db: Database, fileUploadId: string, userId: string): Promise<boolean> {
    if (await userIsAdmin(db, userId)) {
        const [hit] = await db
            .select({ supportRequestMessageId: supportRequestMessageAttachments.supportRequestMessageId })
            .from(supportRequestMessageAttachments)
            .where(eq(supportRequestMessageAttachments.fileUploadId, fileUploadId))
            .limit(1);
        return Boolean(hit);
    }

    const [hit] = await db
        .select({ supportRequestMessageId: supportRequestMessageAttachments.supportRequestMessageId })
        .from(supportRequestMessageAttachments)
        .innerJoin(
            supportRequestMessages,
            eq(supportRequestMessages.supportRequestMessageId, supportRequestMessageAttachments.supportRequestMessageId),
        )
        .innerJoin(supportRequests, eq(supportRequests.supportRequestId, supportRequestMessages.supportRequestId))
        .where(and(eq(supportRequestMessageAttachments.fileUploadId, fileUploadId), eq(supportRequests.userId, userId)))
        .limit(1);
    return Boolean(hit);
}

export async function userIsAdmin(db: Database, userId: string): Promise<boolean> {
    const [row] = await db.select({ adminId: admins.adminId }).from(admins).where(eq(admins.adminId, userId)).limit(1);
    return Boolean(row);
}
