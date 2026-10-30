import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookBookingRequest, GqlSCookBookingRequestsArgs, GqlSSession } from '../graphql/generated';
import { cookBookingRequestHydrate } from '../utils/cookBookingRequestHydrate';
import { cookBookingRequestPoolRowsFind } from '../utils/cookBookingRequestPoolRowsFind';

export async function cookBookingRequestFindMany(
    { cookId }: GqlSCook,
    args: GqlSCookBookingRequestsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookBookingRequest[]> {
    try {
        const [cook] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, cookId)).limit(1);
        if (!cook) {
            return [];
        }

        const visible = await cookBookingRequestPoolRowsFind(cook, { onlyDeclined: args.criterion?.onlyDeclined === true }, serverRuntime);
        return cookBookingRequestHydrate(cook, visible, serverRuntime);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
