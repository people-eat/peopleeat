import { createHash } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { isbot } from 'isbot';

import { idCreate } from '../../shared/idCreate';
import type { Database } from '../db';
import { sessions } from '../db/schema';
import type { Session } from '../db/schema';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { GqlSSession } from '../graphql/generated';
import { toGqlSession } from '../mappers/toGqlSession';
import type { Logger } from '../utils/loggerCreate';

// Hashes the request IP into the column we persist on `Sessions.ipHash`.
// Salted with `VISITOR_IP_HASH_SALT` (per-deploy) so a DB leak does not
// expose visitor IPs and two deploys cannot be cross-correlated. Returns
// `null` when no client IP was resolvable — see `clientIpFromRequest`.
function ipHashCompute(clientIp: string | null): string | null {
    if (!clientIp) return null;
    return createHash('sha256').update(`${environmentVariables.visitorIpHashSalt}:${clientIp}`).digest('hex');
}

export async function sessionUpsert(
    db: Database,
    log: Logger,
    existingSessionId: string | null,
    userAgent: string | null,
    clientIp: string | null,
    referrer: string | null = null,
    landingPath: string | null = null,
): Promise<GqlSSession> {
    try {
        const ipHash = ipHashCompute(clientIp);
        const isBot = isbot(userAgent ?? '');

        let existingSession: Session | undefined;

        if (existingSessionId) {
            const result = await db
                .select()
                .from(sessions)
                .where(and(eq(sessions.sessionId, existingSessionId), isNull(sessions.wasTerminatedAt)));
            existingSession = result[0];
        }

        if (existingSession) {
            const [updatedSession] = await db
                .update(sessions)
                .set({ lastInteractionAt: new Date(), userAgent, ipHash, isBot })
                .where(eq(sessions.sessionId, existingSession.sessionId))
                .returning();

            if (updatedSession) {
                return toGqlSession(updatedSession);
            }
        }

        const [createdSession] = await db
            .insert(sessions)
            .values({
                sessionId: idCreate(),
                userAgent,
                ipHash,
                referrer,
                landingPath,
                isBot,
            })
            .returning();

        if (!createdSession) {
            throw new Error('Session could not be created in sessionUpsert.');
        }

        return toGqlSession(createdSession);
    } catch (error) {
        log.error(error, existingSessionId ? { sessionId: existingSessionId } : undefined);
        throw error;
    }
}
