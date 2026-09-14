import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOutboundEmail, GqlSFileUpload } from '../graphql/generated';
import { outboundEmailAttachmentsFindMany } from '../utils/outboundEmailAttachmentsFindMany';

export async function adminOutboundEmailAttachmentsFindMany(
    parent: Pick<GqlSAdminOutboundEmail, 'outboundEmailId'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSFileUpload[]> {
    return outboundEmailAttachmentsFindMany(serverRuntime.db, parent.outboundEmailId);
}
