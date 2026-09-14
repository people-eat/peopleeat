import { eq } from 'drizzle-orm';

import { fileUploadLoad } from '../db/fileUploadLoad';
import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSFileUpload, GqlSUser } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';

export async function userProfilePictureFindOne(
    parentUser: Pick<GqlSUser, 'userId'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSFileUpload | null> {
    const [row] = await serverRuntime.db
        .select({ profilePictureFileUploadId: users.profilePictureFileUploadId })
        .from(users)
        .where(eq(users.userId, parentUser.userId))
        .limit(1);
    if (row?.profilePictureFileUploadId == null) return null;
    const file = await fileUploadLoad(serverRuntime.db, row.profilePictureFileUploadId);
    return file ? toGqlFileUpload(file) : null;
}
