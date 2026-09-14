import { and, asc, eq, gte, lt } from 'drizzle-orm';

import { cookCallAvailabilityExceptions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCook,
    GqlSCookCallAvailabilityException,
    GqlSCookCallAvailabilityExceptionsArgs,
    GqlSSession,
} from '../graphql/generated';
import { toGqlCookCallAvailabilityException } from '../mappers/toGqlCookCallAvailabilityException';
import { graphqlDateToIsoDate } from '../utils/graphqlDateToIsoDate';

export async function cookCallAvailabilityExceptionFindMany(
    { cookId }: GqlSCook,
    args: GqlSCookCallAvailabilityExceptionsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookCallAvailabilityException[]> {
    const fromDate = graphqlDateToIsoDate(args.from);
    const toDate = graphqlDateToIsoDate(args.to);

    try {
        const rows = await serverRuntime.db
            .select()
            .from(cookCallAvailabilityExceptions)
            .where(
                and(
                    eq(cookCallAvailabilityExceptions.cookId, cookId),
                    gte(cookCallAvailabilityExceptions.date, fromDate),
                    lt(cookCallAvailabilityExceptions.date, toDate),
                ),
            )
            .orderBy(asc(cookCallAvailabilityExceptions.date), asc(cookCallAvailabilityExceptions.startMinuteOfDay));

        return rows.map(toGqlCookCallAvailabilityException);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
