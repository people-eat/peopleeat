import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { OccasionFormatsSection } from '../../shared/occasionFormatsSection';
import type { Occasion } from '../db/schema';
import type { GqlSAdminOccasion, GqlSOccasionFormatsSection, GqlSPublicOccasion } from '../graphql/generated';
import { toGqlContentSection } from './toGqlContentSection';

function toGqlOccasionFormatsSection(section: OccasionFormatsSection): GqlSOccasionFormatsSection {
    return {
        titleDe: section.titleDe,
        titleEn: section.titleEn,
        subtitleDe: section.subtitleDe,
        subtitleEn: section.subtitleEn,
        cards: section.cards.map((card) => ({
            imageFileUploadId: card.imageFileUploadId,
            imageUrl: card.imageFileUploadId ? fileUploadPublicUrl(card.imageFileUploadId) : null,
            titleDe: card.titleDe,
            titleEn: card.titleEn,
            bodyDe: card.bodyDe,
            bodyEn: card.bodyEn,
            fact1De: card.fact1De,
            fact1En: card.fact1En,
            fact2De: card.fact2De,
            fact2En: card.fact2En,
            fact3De: card.fact3De,
            fact3En: card.fact3En,
        })),
    };
}

function occasionContentFields(row: Occasion) {
    return {
        occasionId: row.occasionId,
        pathName: row.pathName,
        previousPathNames: row.previousPathNames,
        name: row.name,
        titleDe: row.titleDe,
        titleEn: row.titleEn,
        descriptionDe: row.descriptionDe,
        descriptionEn: row.descriptionEn,
        headlineDe: row.headlineDe,
        headlineEn: row.headlineEn,
        subHeadlineDe: row.subHeadlineDe,
        subHeadlineEn: row.subHeadlineEn,
        heroImageFileUploadId: row.heroImageFileUploadId,
        heroImageUrl: row.heroImageFileUploadId ? fileUploadPublicUrl(row.heroImageFileUploadId) : null,
        firstSectionHeadlineDe: row.firstSectionHeadlineDe,
        firstSectionHeadlineEn: row.firstSectionHeadlineEn,
        firstSectionBodyDe: row.firstSectionBodyDe,
        firstSectionBodyEn: row.firstSectionBodyEn,
        firstSectionImageFileUploadId: row.firstSectionImageFileUploadId,
        firstSectionImageUrl: row.firstSectionImageFileUploadId ? fileUploadPublicUrl(row.firstSectionImageFileUploadId) : null,
        formatsSection: toGqlOccasionFormatsSection(row.formatsSection),
        sections: row.sections.map(toGqlContentSection),
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function toGqlAdminOccasion(row: Occasion): GqlSAdminOccasion {
    return {
        ...occasionContentFields(row),
        promoCodeId: row.promoCodeId,
        // Field resolver populates promo preview.
        promo: null,
        // Field resolver populates cook assignment.
        cooks: [],
        // Field resolver populates curated testimonials.
        testimonials: [],
    };
}

export function toGqlPublicOccasion(row: Occasion): GqlSPublicOccasion {
    return {
        ...occasionContentFields(row),
        // Field resolver populates promo banner.
        promo: null,
        // Field resolver populates featured cooks.
        featuredCooks: [],
        // Field resolver populates curated testimonials.
        testimonials: [],
    };
}
