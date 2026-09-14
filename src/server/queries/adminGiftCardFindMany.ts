import { giftCards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminGiftCard, GqlSAdminGiftCardsArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminGiftCard } from '../mappers/toGqlAdminGiftCard';
import { adminGiftCardCriterionWhere } from '../utils/adminGiftCardCriterionWhere';
import { adminGiftCardOrderBy } from '../utils/adminGiftCardOrderBy';
import { findManySkip, findManyTake } from '../utils/findManyTake';

export async function adminGiftCardFindMany(
    args: GqlSAdminGiftCardsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminGiftCard[]> {
    try {
        const criterion = args.criterion;
        const where = adminGiftCardCriterionWhere(criterion);
        if (where === false) {
            return [];
        }

        const rows = await serverRuntime.db
            .select()
            .from(giftCards)
            .where(where)
            .orderBy(adminGiftCardOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        return rows.map(toGqlAdminGiftCard);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
