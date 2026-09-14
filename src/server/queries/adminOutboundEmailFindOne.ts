import { eq } from 'drizzle-orm';

import { outboundEmails } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOutboundEmail, GqlSAdminOutboundEmailArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminOutboundEmail } from '../mappers/toGqlAdminOutboundEmail';

export async function adminOutboundEmailFindOne(
    args: GqlSAdminOutboundEmailArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminOutboundEmail | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(outboundEmails)
            .where(eq(outboundEmails.outboundEmailId, args.outboundEmailId))
            .limit(1);
        if (!row) {
            return null;
        }
        return toGqlAdminOutboundEmail(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
