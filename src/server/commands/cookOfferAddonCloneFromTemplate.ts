import { and, eq, isNotNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { cookOfferAddons, cooks, offerAddonTemplates, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationOfferAddonCloneFromTemplateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function cookOfferAddonCloneFromTemplate(
    { cookId }: GqlSCookMutation,
    { offerAddonTemplateId }: GqlSCookMutationOfferAddonCloneFromTemplateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, requestingSession, serverRuntime);

    if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_ADDONS', serverRuntime, cookId))) {
        throw new Error('cookOfferAddonCloneFromTemplate: feature disabled');
    }

    try {
        const [[template], [cookUser]] = await Promise.all([
            serverRuntime.db
                .select()
                .from(offerAddonTemplates)
                .where(and(eq(offerAddonTemplates.offerAddonTemplateId, offerAddonTemplateId), isNotNull(offerAddonTemplates.publishedAt)))
                .limit(1),
            serverRuntime.db
                .select({ locale: users.locale })
                .from(cooks)
                .innerJoin(users, eq(users.userId, cooks.cookId))
                .where(eq(cooks.cookId, cookId))
                .limit(1),
        ]);

        if (!template) {
            throw new Error('cookOfferAddonCloneFromTemplate: published template not found');
        }
        if (!cookUser) {
            throw new Error('cookOfferAddonCloneFromTemplate: cook not found');
        }

        const locale = cookUser.locale === 'en' ? 'en' : 'de';
        const cookOfferAddonId = idCreate();
        await serverRuntime.db.insert(cookOfferAddons).values({
            cookOfferAddonId,
            cookId,
            copyOfOfferAddonTemplateId: template.offerAddonTemplateId,
            title: locale === 'en' ? template.titleEn : template.titleDe,
            description: locale === 'en' ? template.descriptionEn : template.descriptionDe,
            imageFileUploadId: template.imageFileUploadId,
            pricingUnit: template.pricingUnit,
            priceCents: template.suggestedPriceCents,
            inclusion: 'OPTIONAL',
            customerSelected: false,
            deletedAt: null,
        });

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: cookOfferAddonId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
