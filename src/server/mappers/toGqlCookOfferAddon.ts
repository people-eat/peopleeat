import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { CookOfferAddon } from '../db/schema';
import type { GqlSCookOfferAddon, GqlSPublicCookOfferAddon } from '../graphql/generated';

export function toGqlCookOfferAddon(row: CookOfferAddon): GqlSCookOfferAddon {
    return {
        cookOfferAddonId: row.cookOfferAddonId,
        title: row.title,
        description: row.description,
        imageFileUploadId: row.imageFileUploadId ?? null,
        imageUrl: row.imageFileUploadId ? fileUploadPublicUrl(row.imageFileUploadId) : null,
        pricingUnit: row.pricingUnit,
        priceCents: row.priceCents,
        inclusion: row.inclusion,
        customerSelected: row.customerSelected,
        copyOfCookOfferAddonId: row.copyOfCookOfferAddonId ?? null,
        copyOfOfferAddonTemplateId: row.copyOfOfferAddonTemplateId ?? null,
        bookingRequestOfferId: row.bookingRequestOfferId ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function toGqlPublicCookOfferAddon(row: CookOfferAddon): GqlSPublicCookOfferAddon {
    return {
        cookOfferAddonId: row.cookOfferAddonId,
        title: row.title,
        description: row.description,
        imageUrl: row.imageFileUploadId ? fileUploadPublicUrl(row.imageFileUploadId) : null,
        pricingUnit: row.pricingUnit,
        priceCents: row.priceCents,
        inclusion: row.inclusion,
        customerSelected: row.customerSelected,
    };
}
