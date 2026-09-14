import { inArray } from 'drizzle-orm';

import type { Database } from '../db';
import { fileUploadLoad } from '../db/fileUploadLoad';
import { cooks, users } from '../db/schema';
import type { GqlSFileUpload, GqlSPublicCook } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';
import { toGqlPublicCook } from '../mappers/toGqlPublicCook';

async function profilePictureByFileUploadId(db: Database, fileUploadId: string | null): Promise<GqlSFileUpload | null> {
    if (fileUploadId == null) return null;
    const file = await fileUploadLoad(db, fileUploadId);
    return file ? toGqlFileUpload(file) : null;
}

/** Batch-load PublicCook rows (with nested PublicUser) keyed by cookId. */
export async function publicCooksByIdFindMany(db: Database, cookIds: string[]): Promise<Map<string, GqlSPublicCook>> {
    const unique = [...new Set(cookIds)];
    const result = new Map<string, GqlSPublicCook>();
    if (unique.length === 0) return result;

    const cookRows = await db.select().from(cooks).where(inArray(cooks.cookId, unique));
    const userIds = cookRows.map((row) => row.cookId);
    const userRows = userIds.length === 0 ? [] : await db.select().from(users).where(inArray(users.userId, userIds));
    const usersById = new Map(userRows.map((row) => [row.userId, row]));

    await Promise.all(
        cookRows.map(async (cook) => {
            const user = usersById.get(cook.cookId);
            if (!user) return;
            const profilePicture = await profilePictureByFileUploadId(db, user.profilePictureFileUploadId);
            result.set(cook.cookId, toGqlPublicCook(cook, user, profilePicture));
        }),
    );
    return result;
}
