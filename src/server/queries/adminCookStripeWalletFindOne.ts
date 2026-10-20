import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCook, GqlSCookStripeWallet, GqlSSession } from '../graphql/generated';
import { cookStripeWalletLoad } from './cookStripeWalletLoad';

/**
 * Admin live Connect balance. Not gated by `COOK_WALLET_STRIPE_BALANCE` (that
 * toggle only hides the cook self-serve wallet panel).
 */
export async function adminCookStripeWalletFindOne(
    { cookId }: GqlSAdminCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookStripeWallet | null> {
    return cookStripeWalletLoad(cookId, requestingSession, serverRuntime);
}
