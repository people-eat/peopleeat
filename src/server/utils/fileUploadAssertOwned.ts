import { and, eq } from 'drizzle-orm';

import type { Database, DatabaseTransaction } from '../db';
import { fileUploads } from '../db/schema';
import type { FileUpload } from '../db/schema';

const PROFILE_PICTURE_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function fileUploadAssertOwned(
    dbOrTransaction: Database | DatabaseTransaction,
    args: {
        fileUploadId: string;
        userId: string;
        allowedMediaTypes: ReadonlySet<string>;
        commandName: string;
    },
): Promise<FileUpload> {
    const [row] = await dbOrTransaction
        .select()
        .from(fileUploads)
        .where(and(eq(fileUploads.fileUploadId, args.fileUploadId), eq(fileUploads.userId, args.userId)))
        .limit(1);
    if (!row) {
        throw new Error(`${args.commandName}: file upload not found`);
    }
    if (!args.allowedMediaTypes.has(row.mediaType)) {
        throw new Error(`${args.commandName}: file media type is not allowed`);
    }
    return row;
}

export { PROFILE_PICTURE_MEDIA_TYPES };
