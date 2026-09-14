import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAssistantChatCreationsArgs, GqlSAdminTimeBucket, GqlSSession } from '../graphql/generated';
import { adminTimeBucketsFindMany } from '../utils/adminTimeBucketsFindMany';

export async function adminAssistantChatCreationsFindMany(
    args: GqlSAdminAssistantChatCreationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    return adminTimeBucketsFindMany('"Chats"', args.range, args.granularity ?? 'day', requestingSession, serverRuntime);
}
