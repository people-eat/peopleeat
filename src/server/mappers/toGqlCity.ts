import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { City } from '../db/schema';
import type { GqlSAdminCity, GqlSPublicCity } from '../graphql/generated';
import { toGqlContentSection } from './toGqlContentSection';

function cityContentFields(row: City) {
    return {
        cityId: row.cityId,
        pathName: row.pathName,
        previousPathNames: row.previousPathNames,
        nameDe: row.nameDe,
        nameEn: row.nameEn,
        latitude: row.latitude,
        longitude: row.longitude,
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
        sections: row.sections.map(toGqlContentSection),
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function toGqlAdminCity(row: City): GqlSAdminCity {
    return {
        ...cityContentFields(row),
        // Field resolvers populate cook assignment fields.
        cooks: [],
        cooksInTravelRadius: [],
        // Field resolver populates curated testimonials.
        testimonials: [],
    };
}

export function toGqlPublicCity(row: City): GqlSPublicCity {
    return {
        ...cityContentFields(row),
        // Field resolver populates featured cooks.
        featuredCooks: [],
        // Field resolver populates curated testimonials.
        testimonials: [],
    };
}
