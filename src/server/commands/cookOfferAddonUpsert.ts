import { and, eq, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import type { CookOfferAddonCreate } from '../db/schema';
import { bookingRequestOffers, cookOfferAddons, fileUploads } from '../db/schema';
import type { OfferAddonInclusion, OfferAddonPricingUnit } from '../domain/offerAddon';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationOfferAddonUpsertArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { fileUploadAssertOwned, PROFILE_PICTURE_MEDIA_TYPES } from '../utils/fileUploadAssertOwned';

const DRAFT_TITLE = 'Neue Zusatzleistung';

export async function cookOfferAddonUpsert(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationOfferAddonUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_ADDONS', serverRuntime, cookId))) {
        throw new Error('cookOfferAddonUpsert: feature disabled');
    }

    const addon = args.addon;
    try {
        if (!addon?.cookOfferAddonId) {
            return await cookOfferAddonInsert(cookId, addon ?? null, requestingSession, serverRuntime);
        }
        return await cookOfferAddonPatch(cookId, addon.cookOfferAddonId, addon, requestingSession, serverRuntime);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

async function cookOfferAddonInsert(
    cookId: string,
    addon: GqlSCookMutationOfferAddonUpsertArgs['addon'],
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const titled = addon?.title != null ? textNormalizeTitled(addon.title) : '';
    const title = titled.length > 0 ? titled : DRAFT_TITLE;
    const description = addon?.description != null ? textNormalizeProseTitled(addon.description) : '';
    const pricingUnit = addon?.pricingUnit ?? 'FLAT';
    const priceCents = addon?.priceCents ?? 0;
    if (!Number.isInteger(priceCents) || priceCents < 0) {
        throw new Error('cookOfferAddonUpsert: priceCents must be a non-negative integer');
    }
    const inclusion = addon?.inclusion ?? 'OPTIONAL';

    const cookOfferAddonId = idCreate();
    const values: CookOfferAddonCreate = {
        cookOfferAddonId,
        cookId,
        title,
        description,
        pricingUnit,
        priceCents,
        inclusion,
        customerSelected: false,
        deletedAt: null,
    };

    if (addon?.imageFileUploadId) {
        await fileUploadAssertOwned(serverRuntime.db, {
            fileUploadId: addon.imageFileUploadId,
            userId: cookId,
            allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
            commandName: 'cookOfferAddonUpsert',
        });
        values.imageFileUploadId = addon.imageFileUploadId;
    }

    await serverRuntime.db.insert(cookOfferAddons).values(values);
    await serverRuntime.publish.userUpdates({ userId: cookId });
    return { success: true, referenceId: cookOfferAddonId };
}

async function cookOfferAddonPatch(
    cookId: string,
    cookOfferAddonId: string,
    addon: NonNullable<GqlSCookMutationOfferAddonUpsertArgs['addon']>,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const [existing] = await serverRuntime.db
        .select()
        .from(cookOfferAddons)
        .where(
            and(
                eq(cookOfferAddons.cookOfferAddonId, cookOfferAddonId),
                eq(cookOfferAddons.cookId, cookId),
                isNull(cookOfferAddons.deletedAt),
            ),
        )
        .limit(1);
    if (!existing) {
        throw new Error('cookOfferAddonUpsert: addon not found');
    }

    if (existing.bookingRequestOfferId) {
        const [offer] = await serverRuntime.db
            .select({
                userAccepted: bookingRequestOffers.userAccepted,
                cookAccepted: bookingRequestOffers.cookAccepted,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, existing.bookingRequestOfferId))
            .limit(1);
        if (offer?.userAccepted === true && offer.cookAccepted === true) {
            throw new Error('cookOfferAddonUpsert: dual-accepted offer addons are read-only');
        }
    }

    const set: {
        title?: string;
        description?: string;
        imageFileUploadId?: string | null;
        pricingUnit?: OfferAddonPricingUnit;
        priceCents?: number;
        inclusion?: OfferAddonInclusion;
        updatedAt: Date;
    } = { updatedAt: new Date() };

    if (addon.title != null) {
        const title = textNormalizeTitled(addon.title);
        if (title.length === 0) {
            throw new Error('cookOfferAddonUpsert: title must not be empty');
        }
        set.title = title;
    }
    if (addon.description != null) {
        set.description = textNormalizeProseTitled(addon.description);
    }
    if (addon.pricingUnit != null) {
        set.pricingUnit = addon.pricingUnit;
    }
    if (addon.priceCents != null) {
        if (!Number.isInteger(addon.priceCents) || addon.priceCents < 0) {
            throw new Error('cookOfferAddonUpsert: priceCents must be a non-negative integer');
        }
        set.priceCents = addon.priceCents;
    }
    if (addon.inclusion != null) {
        set.inclusion = addon.inclusion;
    }

    let previousImageFileUploadId: string | null | undefined;
    if (addon.imageFileUploadId !== undefined) {
        previousImageFileUploadId = existing.imageFileUploadId;
        if (addon.imageFileUploadId == null) {
            set.imageFileUploadId = null;
        } else {
            await fileUploadAssertOwned(serverRuntime.db, {
                fileUploadId: addon.imageFileUploadId,
                userId: cookId,
                allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                commandName: 'cookOfferAddonUpsert',
            });
            set.imageFileUploadId = addon.imageFileUploadId;
        }
    }

    if (
        set.title === undefined &&
        set.description === undefined &&
        set.imageFileUploadId === undefined &&
        set.pricingUnit === undefined &&
        set.priceCents === undefined &&
        set.inclusion === undefined
    ) {
        throw new Error('cookOfferAddonUpsert: at least one field is required');
    }

    await serverRuntime.db.update(cookOfferAddons).set(set).where(eq(cookOfferAddons.cookOfferAddonId, cookOfferAddonId));

    if (previousImageFileUploadId && set.imageFileUploadId !== undefined && set.imageFileUploadId !== previousImageFileUploadId) {
        await serverRuntime.db
            .delete(fileUploads)
            .where(and(eq(fileUploads.fileUploadId, previousImageFileUploadId), eq(fileUploads.userId, cookId)));
    }

    await serverRuntime.publish.userUpdates({ userId: cookId });
    return { success: true, referenceId: cookOfferAddonId };
}
