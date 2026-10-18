import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { Partner } from '../db/schema';
import type { GqlSAdminPartner, GqlSPublicPartner } from '../graphql/generated';
import { toGqlContentSection } from './toGqlContentSection';

function partnerContentFields(row: Partner) {
    return {
        partnerId: row.partnerId,
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
        firstSectionCtaUrl: row.firstSectionCtaUrl,
        heroImageOverlay: row.heroImageOverlay,
        firstSectionImageOverlay: row.firstSectionImageOverlay,
        howItWorksAlternativeMedia: row.howItWorksAlternativeMedia,
        sections: row.sections.map(toGqlContentSection),
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function toGqlAdminPartner(row: Partner): GqlSAdminPartner {
    return {
        ...partnerContentFields(row),
        promoCodeId: row.promoCodeId,
        // Field resolver populates promo preview.
        promo: null,
        // Field resolver populates cook assignment.
        cooks: [],
        // Field resolver populates curated testimonials.
        testimonials: [],
    };
}

export function toGqlPublicPartner(row: Partner): GqlSPublicPartner {
    return {
        ...partnerContentFields(row),
        // Field resolver populates promo banner.
        promo: null,
        // Field resolver populates featured cooks.
        featuredCooks: [],
        // Field resolver populates curated testimonials.
        testimonials: [],
    };
}
