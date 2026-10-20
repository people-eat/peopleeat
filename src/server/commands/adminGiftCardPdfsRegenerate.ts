import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationGiftCardPdfsRegenerateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { giftCardPdfsRegenerateForPayedCard } from '../utils/giftCardPdfsCreate';

export async function adminGiftCardPdfsRegenerate(
    { adminId }: GqlSAdminMutation,
    { giftCardId }: GqlSAdminMutationGiftCardPdfsRegenerateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const ok = await giftCardPdfsRegenerateForPayedCard(giftCardId, serverRuntime);
        return ok ? { success: true, referenceId: giftCardId } : { success: false };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
