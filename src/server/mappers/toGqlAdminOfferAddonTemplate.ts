import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { OfferAddonTemplate } from '../db/schema';
import type { GqlSAdminOfferAddonTemplate } from '../graphql/generated';

export function toGqlAdminOfferAddonTemplate(row: OfferAddonTemplate): GqlSAdminOfferAddonTemplate {
    return {
        offerAddonTemplateId: row.offerAddonTemplateId,
        titleDe: row.titleDe,
        titleEn: row.titleEn,
        descriptionDe: row.descriptionDe,
        descriptionEn: row.descriptionEn,
        pricingUnit: row.pricingUnit,
        suggestedPriceCents: row.suggestedPriceCents,
        imageFileUploadId: row.imageFileUploadId ?? null,
        imageUrl: row.imageFileUploadId ? fileUploadPublicUrl(row.imageFileUploadId) : null,
        position: row.position,
        publishedAt: row.publishedAt ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
