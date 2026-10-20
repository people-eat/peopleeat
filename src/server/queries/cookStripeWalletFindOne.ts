import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookStripeWallet, GqlSSession } from '../graphql/generated';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { cookStripeWalletLoad } from './cookStripeWalletLoad';

export async function cookStripeWalletFindOne(
    { cookId }: GqlSCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookStripeWallet | null> {
    if (!requestingSession.userId || requestingSession.userId !== cookId) {
        return null;
    }

    const enabled = await featureToggleIsEnabled('COOK_WALLET_STRIPE_BALANCE', serverRuntime, cookId);
    if (!enabled) {
        return null;
    }

    return cookStripeWalletLoad(cookId, requestingSession, serverRuntime);
}
