import { eq } from 'drizzle-orm';

import { promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPromoCode, GqlSAdminPromoCodeArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminPromoCode } from '../mappers/toGqlAdminPromoCode';

export async function adminPromoCodeFindOne(
    args: GqlSAdminPromoCodeArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminPromoCode | null> {
    try {
        const [row] = await serverRuntime.db.select().from(promoCodes).where(eq(promoCodes.promoCodeId, args.promoCodeId)).limit(1);
        if (!row) {
            return null;
        }
        return toGqlAdminPromoCode(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
