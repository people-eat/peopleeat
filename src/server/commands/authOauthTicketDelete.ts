import { and, eq, isNull } from 'drizzle-orm';

import { authOauthTickets } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationAuthOauthTicketDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { authOauthTicketRowDelete } from '../utils/authOauthTicketReplace';

export async function authOauthTicketDelete(
    args: GqlSMutationAuthOauthTicketDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const [row] = await serverRuntime.db
            .select({ authOauthTicketId: authOauthTickets.authOauthTicketId })
            .from(authOauthTickets)
            .where(
                and(
                    eq(authOauthTickets.authOauthTicketId, args.authOauthTicketId),
                    eq(authOauthTickets.sessionId, requestingSession.sessionId),
                    isNull(authOauthTickets.consumedAt),
                ),
            )
            .limit(1);

        if (!row) {
            throw new Error('authOauthTicketDelete: not found');
        }

        await serverRuntime.db.transaction(async (transaction) => {
            await authOauthTicketRowDelete(transaction, args.authOauthTicketId);
        });
        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
        return { success: true, referenceId: args.authOauthTicketId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
