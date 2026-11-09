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
    timeZoneById: Map<string, string>;
};

/** Batch-load PublicUser rows (display = firstName) with optional profile pictures. Never selects FileUploads.bytes. */
export async function publicUsersByIdFindMany(db: Database, userIds: string[]): Promise<PublicUsersByIdFindManyResult> {
    const unique = [...new Set(userIds)];
    const byId = new Map<string, GqlSPublicUser>();
    const localeById = new Map<string, Locale>();
    const timeZoneById = new Map<string, string>();
    if (unique.length === 0) return { byId, localeById, timeZoneById };

    const rows = await db
        .select({
            firstName: users.firstName,
            createdAt: users.createdAt,
            userId: users.userId,
            locale: users.locale,
            timeZone: users.timeZone,
            profilePicture: fileUploadMetadataColumns,
        })
        .from(users)
        .leftJoin(fileUploads, eq(fileUploads.fileUploadId, users.profilePictureFileUploadId))
        .where(inArray(users.userId, unique));

    for (const row of rows) {
        const profilePicture = row.profilePicture ? toGqlFileUpload(row.profilePicture) : null;
        byId.set(row.userId, toGqlPublicUser(row, profilePicture));
        localeById.set(row.userId, row.locale);
        timeZoneById.set(row.userId, row.timeZone);
    }
    return { byId, localeById, timeZoneById };
}

/** Lean IANA zone lookup (no PublicUser / profile pictures). */
export async function userTimeZonesByIdFindMany(db: Database, userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    const result = new Map<string, string>();
    if (unique.length === 0) return result;

    const rows = await db.select({ userId: users.userId, timeZone: users.timeZone }).from(users).where(inArray(users.userId, unique));
    for (const row of rows) {
        result.set(row.userId, row.timeZone);
    }
    return result;
}
