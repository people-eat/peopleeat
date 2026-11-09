import { and, eq, isNull } from 'drizzle-orm';

import { cookOfferAddons } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationOfferAddonDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function cookOfferAddonDelete(
    { cookId }: GqlSCookMutation,
    { cookOfferAddonId }: GqlSCookMutationOfferAddonDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, requestingSession, serverRuntime);

    if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_ADDONS', serverRuntime, cookId))) {
        throw new Error('cookOfferAddonDelete: feature disabled');
    }

    try {
        const updated = await serverRuntime.db
            .update(cookOfferAddons)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(
                and(
                    eq(cookOfferAddons.cookOfferAddonId, cookOfferAddonId),
                    eq(cookOfferAddons.cookId, cookId),
                    isNull(cookOfferAddons.bookingRequestOfferId),
                    isNull(cookOfferAddons.deletedAt),
                ),
            )
            .returning({ cookOfferAddonId: cookOfferAddons.cookOfferAddonId });
        if (updated.length === 0) {
            throw new Error('cookOfferAddonDelete: library addon not found');
        }
        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: cookOfferAddonId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
