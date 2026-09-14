import { outboundEmails } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOutboundEmail, GqlSAdminOutboundEmailsArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminOutboundEmail } from '../mappers/toGqlAdminOutboundEmail';
import { adminOutboundEmailCriterionWhere } from '../utils/adminOutboundEmailCriterionWhere';
import { adminOutboundEmailOrderBy } from '../utils/adminOutboundEmailOrderBy';
import { findManySkip, findManyTake } from '../utils/findManyTake';

export async function adminOutboundEmailFindMany(
    args: GqlSAdminOutboundEmailsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminOutboundEmail[]> {
    try {
        const criterion = args.criterion;
        const where = adminOutboundEmailCriterionWhere(criterion);
        if (where === false) {
            return [];
        }

        const rows = await serverRuntime.db
            .select()
            .from(outboundEmails)
            .where(where)
            .orderBy(adminOutboundEmailOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        return rows.map(toGqlAdminOutboundEmail);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
