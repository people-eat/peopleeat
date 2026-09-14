import { inArray } from 'drizzle-orm';

import type { Database } from '../db';
import { fileUploadLoad } from '../db/fileUploadLoad';
import { users } from '../db/schema';
import type { GqlSFileUpload, GqlSPublicUser } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';
import { toGqlPublicUser } from '../mappers/toGqlPublicUser';

async function profilePictureByFileUploadId(db: Database, fileUploadId: string | null): Promise<GqlSFileUpload | null> {
    if (fileUploadId == null) return null;
    const file = await fileUploadLoad(db, fileUploadId);
    return file ? toGqlFileUpload(file) : null;
}

/** Batch-load PublicUser rows (display = firstName) with optional profile pictures. */
export async function publicUsersByIdFindMany(db: Database, userIds: string[]): Promise<Map<string, GqlSPublicUser>> {
    const unique = [...new Set(userIds)];
    const result = new Map<string, GqlSPublicUser>();
    if (unique.length === 0) return result;

    const rows = await db.select().from(users).where(inArray(users.userId, unique));
    await Promise.all(
        rows.map(async (row) => {
            const profilePicture = await profilePictureByFileUploadId(db, row.profilePictureFileUploadId);
            result.set(row.userId, toGqlPublicUser(row, profilePicture));
        }),
    );
    return result;
}
