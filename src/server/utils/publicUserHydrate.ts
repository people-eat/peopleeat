import { eq, inArray } from 'drizzle-orm';

import type { Database } from '../db';
import { fileUploadMetadataColumns } from '../db/fileUploadMetadata';
import { fileUploads, users } from '../db/schema';
import type { GqlSPublicUser } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';
import { toGqlPublicUser } from '../mappers/toGqlPublicUser';

/** Batch-load PublicUser rows (display = firstName) with optional profile pictures. Never selects FileUploads.bytes. */
export async function publicUsersByIdFindMany(db: Database, userIds: string[]): Promise<Map<string, GqlSPublicUser>> {
    const unique = [...new Set(userIds)];
    const result = new Map<string, GqlSPublicUser>();
    if (unique.length === 0) return result;

    const rows = await db
        .select({
            firstName: users.firstName,
            createdAt: users.createdAt,
            userId: users.userId,
            profilePicture: fileUploadMetadataColumns,
        })
        .from(users)
        .leftJoin(fileUploads, eq(fileUploads.fileUploadId, users.profilePictureFileUploadId))
        .where(inArray(users.userId, unique));

    for (const row of rows) {
        const profilePicture = row.profilePicture ? toGqlFileUpload(row.profilePicture) : null;
        result.set(row.userId, toGqlPublicUser(row, profilePicture));
    }
    return result;
}
