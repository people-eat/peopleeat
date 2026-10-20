import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationGiftCardPdfsRegenerateArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { giftCardPdfsRegenerateForPayedCard } from '../utils/giftCardPdfsCreate';

export async function giftCardPdfsRegenerate(
    { userId }: GqlSUserMutation,
    { giftCardId }: GqlSUserMutationGiftCardPdfsRegenerateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    try {
        const ok = await giftCardPdfsRegenerateForPayedCard(giftCardId, serverRuntime, { requireBuyerUserId: userId });
        return ok ? { success: true, referenceId: giftCardId } : { success: false };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
