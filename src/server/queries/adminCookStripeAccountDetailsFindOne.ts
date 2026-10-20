import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCook, GqlSCookStripeAccountDetails, GqlSSession } from '../graphql/generated';
import { cookStripeAccountDetailsLoad } from './cookStripeAccountDetailsLoad';

/** Admin live Stripe requirements snapshot for the cook Connect account. */
export async function adminCookStripeAccountDetailsFindOne(
    { cookId }: GqlSAdminCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookStripeAccountDetails | null> {
    return cookStripeAccountDetailsLoad(cookId, requestingSession, serverRuntime);
}
