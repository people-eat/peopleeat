import { eq } from 'drizzle-orm';

import { aiGenerations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAiGeneration, GqlSAdminAiGenerationArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminAiGeneration } from '../mappers/toGqlAdminAiGeneration';

export async function adminAiGenerationFindOne(
    args: GqlSAdminAiGenerationArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAiGeneration | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(aiGenerations)
            .where(eq(aiGenerations.aiGenerationId, args.aiGenerationId))
            .limit(1);
        if (!row) {
            return null;
        }
        return toGqlAdminAiGeneration(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
