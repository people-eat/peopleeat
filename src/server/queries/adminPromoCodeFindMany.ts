import { promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPromoCode, GqlSAdminPromoCodesArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminPromoCode } from '../mappers/toGqlAdminPromoCode';
import { adminPromoCodeCriterionWhere } from '../utils/adminPromoCodeCriterionWhere';
import { adminPromoCodeOrderBy } from '../utils/adminPromoCodeOrderBy';
import { findManySkip, findManyTake } from '../utils/findManyTake';

export async function adminPromoCodeFindMany(
    args: GqlSAdminPromoCodesArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminPromoCode[]> {
    try {
        const criterion = args.criterion;
        const where = adminPromoCodeCriterionWhere(criterion);

        const rows = await serverRuntime.db
            .select()
            .from(promoCodes)
            .where(where)
            .orderBy(adminPromoCodeOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        return rows.map(toGqlAdminPromoCode);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
