import { eq, inArray } from 'drizzle-orm';

import type { Database, DatabaseTransaction } from '../db';
import { fileUploadMetadataColumns } from '../db/fileUploadMetadata';
import { fileUploads, users } from '../db/schema';
import type { GqlSFileUpload } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';

/** Batch-load current profile pictures for testimonial authors keyed by `userId`. */
export async function testimonialAuthorProfilePicturesLoad(
    dbOrTransaction: Database | DatabaseTransaction,
    userIds: ReadonlyArray<string>,
): Promise<Map<string, GqlSFileUpload | null>> {
    const unique = [...new Set(userIds.filter(Boolean))];
    const byUserId = new Map<string, GqlSFileUpload | null>();
    if (unique.length === 0) return byUserId;

    for (const userId of unique) {
        byUserId.set(userId, null);
    }

    const rows = await dbOrTransaction
        .select({
            userId: users.userId,
            profilePicture: fileUploadMetadataColumns,
        })
        .from(users)
        .leftJoin(fileUploads, eq(fileUploads.fileUploadId, users.profilePictureFileUploadId))
        .where(inArray(users.userId, unique));

    for (const row of rows) {
        byUserId.set(row.userId, row.profilePicture?.fileUploadId ? toGqlFileUpload(row.profilePicture) : null);
    }
    return byUserId;
}
