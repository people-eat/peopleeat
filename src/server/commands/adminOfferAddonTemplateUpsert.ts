import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import type { OfferAddonTemplateCreate } from '../db/schema';
import { offerAddonTemplates } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationOfferAddonTemplateUpsertArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { fileUploadAssertOwned, PROFILE_PICTURE_MEDIA_TYPES } from '../utils/fileUploadAssertOwned';

export async function adminOfferAddonTemplateUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationOfferAddonTemplateUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const titleDe = textNormalizeTitled(input.titleDe);
        const titleEn = textNormalizeTitled(input.titleEn);
        if (!titleDe || !titleEn) {
            throw new Error('adminOfferAddonTemplateUpsert: titleDe and titleEn are required');
        }
        if (!Number.isInteger(input.suggestedPriceCents) || input.suggestedPriceCents < 0) {
            throw new Error('adminOfferAddonTemplateUpsert: suggestedPriceCents must be a non-negative integer');
        }
        const pricingUnit = input.pricingUnit;

        const now = new Date();
        const offerAddonTemplateId = input.offerAddonTemplateId ?? idCreate();
        let previousImageFileUploadId: string | null | undefined;

        if (input.offerAddonTemplateId) {
            const [existing] = await serverRuntime.db
                .select()
                .from(offerAddonTemplates)
                .where(eq(offerAddonTemplates.offerAddonTemplateId, input.offerAddonTemplateId))
                .limit(1);
            if (!existing) {
                throw new Error('adminOfferAddonTemplateUpsert: template not found');
            }
            previousImageFileUploadId = existing.imageFileUploadId;
        }

        let imageFileUploadId: string | null = null;
        if (input.imageFileUploadId !== undefined && input.imageFileUploadId !== null) {
            await fileUploadAssertOwned(serverRuntime.db, {
                fileUploadId: input.imageFileUploadId,
                userId: adminId,
                allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                commandName: 'adminOfferAddonTemplateUpsert',
            });
            imageFileUploadId = input.imageFileUploadId;
        } else if (input.imageFileUploadId === null) {
            imageFileUploadId = null;
        } else if (input.offerAddonTemplateId) {
            imageFileUploadId = previousImageFileUploadId ?? null;
        }

        const values: OfferAddonTemplateCreate = {
            offerAddonTemplateId,
            titleDe,
            titleEn,
            descriptionDe: textNormalizeProseTitled(input.descriptionDe),
            descriptionEn: textNormalizeProseTitled(input.descriptionEn),
            pricingUnit,
            suggestedPriceCents: input.suggestedPriceCents,
            imageFileUploadId,
            position: input.position ?? 0,
            publishedAt: input.publishedAt ?? null,
            createdAt: now,
            updatedAt: now,
        };

        if (input.offerAddonTemplateId) {
            await serverRuntime.db
                .update(offerAddonTemplates)
                .set({
                    titleDe: values.titleDe,
                    titleEn: values.titleEn,
                    descriptionDe: values.descriptionDe,
                    descriptionEn: values.descriptionEn,
                    pricingUnit: values.pricingUnit,
                    suggestedPriceCents: values.suggestedPriceCents,
                    imageFileUploadId: values.imageFileUploadId,
                    position: values.position,
                    publishedAt: values.publishedAt,
                    updatedAt: now,
                })
                .where(eq(offerAddonTemplates.offerAddonTemplateId, offerAddonTemplateId));
        } else {
            await serverRuntime.db.insert(offerAddonTemplates).values(values);
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: offerAddonTemplateId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
