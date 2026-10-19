import { eq } from 'drizzle-orm';

import { fileUploads } from './schema';
import type { FileUpload } from './schema';
import type { Database, DatabaseTransaction } from './index';

// By-id load including `bytes`. **Only** for GET /api/file-uploads/:id (and any
// future path that must stream the payload). GraphQL and list hydrates must use
// `fileUploadMetadataLoad` / `fileUploadMetadataColumns` — never this helper.
export async function fileUploadLoad(dbOrTransaction: Database | DatabaseTransaction, fileUploadId: string): Promise<FileUpload | null> {
    const rows = await dbOrTransaction.select().from(fileUploads).where(eq(fileUploads.fileUploadId, fileUploadId)).limit(1);
    return rows[0] ?? null;
}
