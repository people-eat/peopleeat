import { and, eq, inArray } from 'drizzle-orm';

import type { Database, DatabaseTransaction } from '../db';
import { fileUploads } from '../db/schema';

/** Ensures every id exists and is owned by `userId`. Dedupes before checking. */
export async function fileUploadIdsAssertOwned(
    dbOrTx: Database | DatabaseTransaction,
    args: {
        userId: string;
        fileUploadIds: ReadonlyArray<string>;
        commandName: string;
    },
): Promise<string[]> {
    const requested = Array.from(new Set(args.fileUploadIds));
    if (requested.length === 0) return [];

    const owned = await dbOrTx
        .select({ fileUploadId: fileUploads.fileUploadId })
        .from(fileUploads)
        .where(and(eq(fileUploads.userId, args.userId), inArray(fileUploads.fileUploadId, requested)));

    if (owned.length !== requested.length) {
        throw new Error(
            `${args.commandName}: ${requested.length - owned.length} of ${requested.length} fileUploadId(s) are not owned by user ${args.userId}`,
        );
    }

    return requested;
}
