import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { Partner, PartnerVenue } from '../db/schema';
import type { GqlSAdminPartner, GqlSAdminPartnerVenue, GqlSPublicPartnerVenue } from '../graphql/generated';
import { toGqlContentSection } from './toGqlContentSection';
import { toGqlCookTravelOriginAddress } from './toGqlCook';

export function toGqlAdminPartner(row: Partner, venues: PartnerVenue[] = []): GqlSAdminPartner {
    const partner: GqlSAdminPartner = {
        partnerId: row.partnerId,
        name: row.name,
        venues: [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
    partner.venues = venues.map((venue) => toGqlAdminPartnerVenue(venue, partner));
    return partner;
}

function partnerVenueContentFields(row: PartnerVenue) {
    return {
        partnerVenueId: row.partnerVenueId,
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
        featuredCooksShowCity: row.featuredCooksShowCity,
        locationAddress: row.locationAddress ? toGqlCookTravelOriginAddress(row.locationAddress) : null,
        sections: row.sections.map(toGqlContentSection),
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function toGqlAdminPartnerVenue(row: PartnerVenue, partner: GqlSAdminPartner): GqlSAdminPartnerVenue {
    return {
        ...partnerVenueContentFields(row),
        partner,
        promoCodeId: row.promoCodeId,
        promo: null,
        cooks: [],
        testimonials: [],
    };
}

export function toGqlPublicPartnerVenue(row: PartnerVenue): GqlSPublicPartnerVenue {
    const { partnerId: _partnerId, ...fields } = partnerVenueContentFields(row);
    return {
        ...fields,
        promo: null,
        featuredCooks: [],
        testimonials: [],
    };
}
