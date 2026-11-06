import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { Locale } from '../../shared/locale';
import type { OfferAddonTemplate } from '../db/schema';
import type { GqlSOfferAddonTemplate } from '../graphql/generated';

export function toGqlOfferAddonTemplate(row: OfferAddonTemplate, locale: Locale): GqlSOfferAddonTemplate {
    return {
        offerAddonTemplateId: row.offerAddonTemplateId,
        title: locale === 'en' ? row.titleEn : row.titleDe,
        description: locale === 'en' ? row.descriptionEn : row.descriptionDe,
        pricingUnit: row.pricingUnit,
        suggestedPriceCents: row.suggestedPriceCents,
        imageUrl: row.imageFileUploadId ? fileUploadPublicUrl(row.imageFileUploadId) : null,
        position: row.position,
    };
}
