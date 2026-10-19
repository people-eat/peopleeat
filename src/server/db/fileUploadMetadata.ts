import { eq } from 'drizzle-orm';

import { fileUploads } from './schema';
import type { FileUpload } from './schema';
import type { Database, DatabaseTransaction } from './index';

/** Columns GraphQL / URL consumers need — never include `bytes` (served only via GET /api/file-uploads/:id). */
export type FileUploadMetadata = Pick<FileUpload, 'fileUploadId' | 'filename' | 'mediaType' | 'size'>;

export const fileUploadMetadataColumns = {
    fileUploadId: fileUploads.fileUploadId,
    filename: fileUploads.filename,
    mediaType: fileUploads.mediaType,
    size: fileUploads.size,
} as const;

/** By-id metadata load for GraphQL field resolvers. Does not select `bytes`. */
export async function fileUploadMetadataLoad(
    dbOrTransaction: Database | DatabaseTransaction,
    fileUploadId: string,
): Promise<FileUploadMetadata | null> {
    const [row] = await dbOrTransaction
        .select(fileUploadMetadataColumns)
        .from(fileUploads)
        .where(eq(fileUploads.fileUploadId, fileUploadId))
        .limit(1);
    return row ?? null;
}
