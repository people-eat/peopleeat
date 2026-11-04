import { eq } from 'drizzle-orm';

import { cookPresenceLinksNormalize } from '../../shared/cookPresenceLinks';
import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookPresenceLinksUpdate, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function cookPresenceLinksReplaceApply(
    cookId: string,
    input: GqlSCookPresenceLinksUpdate,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    commandName: string,
): Promise<GqlSMutationResult> {
    const normalized = cookPresenceLinksNormalize(input);
    if (!normalized.ok) {
        throw new Error(`${commandName}: ${normalized.issue.code}`);
    }

    try {
        const [updated] = await serverRuntime.db
            .update(cooks)
            .set({ presenceLinks: normalized.value, lastModifiedAt: new Date() })
            .where(eq(cooks.cookId, cookId))
            .returning({ cookId: cooks.cookId });
        if (!updated) {
            throw new Error(`${commandName}: cook not found`);
        }

        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: cookId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
