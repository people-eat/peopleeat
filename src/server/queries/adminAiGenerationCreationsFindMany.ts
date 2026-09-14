import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAiGenerationCreationsArgs, GqlSAdminTimeBucket, GqlSSession } from '../graphql/generated';
import { adminTimeBucketsFindMany } from '../utils/adminTimeBucketsFindMany';

export async function adminAiGenerationCreationsFindMany(
    args: GqlSAdminAiGenerationCreationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    return adminTimeBucketsFindMany('"AiGenerations"', args.range, args.granularity ?? 'day', requestingSession, serverRuntime);
}
