import { eq, inArray } from 'drizzle-orm';

import type { Database } from '../db';
import { fileUploadMetadataColumns } from '../db/fileUploadMetadata';
import { cooks, fileUploads, users } from '../db/schema';
import type { GqlSPublicCook } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';
import { toGqlPublicCook } from '../mappers/toGqlPublicCook';

/** Batch-load PublicCook rows (with nested PublicUser) keyed by cookId. Never selects FileUploads.bytes. */
export async function publicCooksByIdFindMany(db: Database, cookIds: string[]): Promise<Map<string, GqlSPublicCook>> {
    const unique = [...new Set(cookIds)];
    const result = new Map<string, GqlSPublicCook>();
    if (unique.length === 0) return result;

    const rows = await db
        .select({
            cook: cooks,
            firstName: users.firstName,
            userCreatedAt: users.createdAt,
            profilePicture: fileUploadMetadataColumns,
        })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .leftJoin(fileUploads, eq(fileUploads.fileUploadId, users.profilePictureFileUploadId))
        .where(inArray(cooks.cookId, unique));

    for (const row of rows) {
        const profilePicture = row.profilePicture ? toGqlFileUpload(row.profilePicture) : null;
        result.set(row.cook.cookId, toGqlPublicCook(row.cook, { firstName: row.firstName, createdAt: row.userCreatedAt }, profilePicture));
    }
    return result;
}
