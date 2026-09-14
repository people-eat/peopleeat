import { eq } from 'drizzle-orm';

import { fileUploads } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSFileUpload } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';

/** Shared file-upload resolver for gift-card PDF FKs (invoice / voucher). */
export async function giftCardFileUploadFindOne(
    fileUploadId: string | null | undefined,
    serverRuntime: ServerRuntime,
): Promise<GqlSFileUpload | null> {
    if (!fileUploadId) {
        return null;
    }
    const [row] = await serverRuntime.db
        .select({
            fileUploadId: fileUploads.fileUploadId,
            filename: fileUploads.filename,
            mediaType: fileUploads.mediaType,
            size: fileUploads.size,
        })
        .from(fileUploads)
        .where(eq(fileUploads.fileUploadId, fileUploadId))
        .limit(1);
    return row ? toGqlFileUpload(row) : null;
}
