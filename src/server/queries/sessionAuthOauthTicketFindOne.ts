import { and, desc, eq, gt, isNull } from 'drizzle-orm';

import { authOauthTickets } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAuthOauthTicket, GqlSSession } from '../graphql/generated';
import { toGqlAuthOauthTicket } from '../mappers/toGqlAuthOauthTicket';

export async function sessionAuthOauthTicketFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAuthOauthTicket | null> {
    const now = new Date();
    const [row] = await serverRuntime.db
        .select()
        .from(authOauthTickets)
        .where(
            and(
                eq(authOauthTickets.sessionId, requestingSession.sessionId),
                isNull(authOauthTickets.consumedAt),
                gt(authOauthTickets.expiresAt, now),
            ),
        )
        .orderBy(desc(authOauthTickets.createdAt))
        .limit(1);

    return row ? toGqlAuthOauthTicket(row) : null;
}
