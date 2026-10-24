import { eq, inArray } from 'drizzle-orm';

import type { Locale } from '../../shared/locale';
import type { Database } from '../db';
import { fileUploadMetadataColumns } from '../db/fileUploadMetadata';
import { fileUploads, users } from '../db/schema';
import type { GqlSPublicUser } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';
import { toGqlPublicUser } from '../mappers/toGqlPublicUser';

export type PublicUsersByIdFindManyResult = {
    byId: Map<string, GqlSPublicUser>;
    localeById: Map<string, Locale>;
};

/** Batch-load PublicUser rows (display = firstName) with optional profile pictures. Never selects FileUploads.bytes. */
export async function publicUsersByIdFindMany(db: Database, userIds: string[]): Promise<PublicUsersByIdFindManyResult> {
    const unique = [...new Set(userIds)];
    const byId = new Map<string, GqlSPublicUser>();
    const localeById = new Map<string, Locale>();
    if (unique.length === 0) return { byId, localeById };

    const rows = await db
        .select({
            firstName: users.firstName,
            createdAt: users.createdAt,
            userId: users.userId,
            locale: users.locale,
            profilePicture: fileUploadMetadataColumns,
        })
        .from(users)
        .leftJoin(fileUploads, eq(fileUploads.fileUploadId, users.profilePictureFileUploadId))
        .where(inArray(users.userId, unique));

    for (const row of rows) {
        const profilePicture = row.profilePicture ? toGqlFileUpload(row.profilePicture) : null;
        byId.set(row.userId, toGqlPublicUser(row, profilePicture));
        localeById.set(row.userId, row.locale);
    }
    return { byId, localeById };
}
