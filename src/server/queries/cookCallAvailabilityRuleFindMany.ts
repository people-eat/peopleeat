import { asc, eq } from 'drizzle-orm';

import { cookCallAvailabilityRules } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookCallAvailabilityRule, GqlSSession } from '../graphql/generated';
import { toGqlCookCallAvailabilityRule } from '../mappers/toGqlCookCallAvailabilityRule';

export async function cookCallAvailabilityRuleFindMany(
    { cookId }: Pick<GqlSCook, 'cookId'>,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookCallAvailabilityRule[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(cookCallAvailabilityRules)
            .where(eq(cookCallAvailabilityRules.cookId, cookId))
            .orderBy(asc(cookCallAvailabilityRules.dayOfWeek), asc(cookCallAvailabilityRules.startMinuteOfDay));

        return rows.map(toGqlCookCallAvailabilityRule);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
