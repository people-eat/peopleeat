import { and, eq, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { cookOfferAddons } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

type DbExecutor = Pick<ServerRuntime['db'], 'select' | 'insert'>;

export type CookOfferAddonDeepCopyInsertInput = {
    cookId: string;
    sourceCookOfferAddonId: string;
    bookingRequestOfferId: string;
};

/**
 * Deep-copies a cook inventory addon onto an offer. Source must be inventory
 * (`bookingRequestOfferId` null) and not soft-deleted. OPTIONAL starts
 * unselected; REQUIRED starts selected.
 */
export async function cookOfferAddonDeepCopyInsert(db: DbExecutor, input: CookOfferAddonDeepCopyInsertInput): Promise<string> {
    const [source] = await db
        .select()
        .from(cookOfferAddons)
        .where(
            and(
                eq(cookOfferAddons.cookOfferAddonId, input.sourceCookOfferAddonId),
                eq(cookOfferAddons.cookId, input.cookId),
                isNull(cookOfferAddons.bookingRequestOfferId),
                isNull(cookOfferAddons.deletedAt),
            ),
        )
        .limit(1);

    if (!source) {
        throw new Error('cookOfferAddonDeepCopyInsert: source addon not found');
    }

    const cookOfferAddonId = idCreate();
    await db.insert(cookOfferAddons).values({
        cookOfferAddonId,
        cookId: input.cookId,
        bookingRequestOfferId: input.bookingRequestOfferId,
        copyOfCookOfferAddonId: source.cookOfferAddonId,
        copyOfOfferAddonTemplateId: source.copyOfOfferAddonTemplateId,
        title: source.title,
        description: source.description,
        imageFileUploadId: source.imageFileUploadId,
        pricingUnit: source.pricingUnit,
        priceCents: source.priceCents,
        inclusion: source.inclusion,
        customerSelected: source.inclusion === 'REQUIRED',
        deletedAt: null,
    });

    return cookOfferAddonId;
}
