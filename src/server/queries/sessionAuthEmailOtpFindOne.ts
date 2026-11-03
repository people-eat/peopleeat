import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm';

import { authEmailOtps } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAuthEmailOtp, GqlSSession } from '../graphql/generated';
import { toGqlAuthEmailOtp } from '../mappers/toGqlAuthEmailOtp';

export async function sessionAuthEmailOtpFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAuthEmailOtp | null> {
    const now = new Date();
    const [row] = await serverRuntime.db
        .select()
        .from(authEmailOtps)
        .where(
            and(
                eq(authEmailOtps.sessionId, requestingSession.sessionId),
                ne(authEmailOtps.purpose, 'ACCOUNT_DELETE'),
                isNull(authEmailOtps.consumedAt),
                isNull(authEmailOtps.dismissedAt),
                gt(authEmailOtps.expiresAt, now),
            ),
        )
        .orderBy(desc(authEmailOtps.createdAt))
        .limit(1);

    return row ? toGqlAuthEmailOtp(row) : null;
}
