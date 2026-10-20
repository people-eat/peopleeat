import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookStripeAccountDetails, GqlSSession } from '../graphql/generated';
import { cookStripeAccountDetailsLoad } from './cookStripeAccountDetailsLoad';

export async function cookStripeAccountDetailsFindOne(
    { cookId }: GqlSCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookStripeAccountDetails | null> {
    if (!requestingSession.userId || requestingSession.userId !== cookId) {
        return null;
    }

    return cookStripeAccountDetailsLoad(cookId, requestingSession, serverRuntime);
}
