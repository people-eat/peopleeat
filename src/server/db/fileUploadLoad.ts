import { eq } from 'drizzle-orm';

import { fileUploads } from './schema';
import type { FileUpload } from './schema';
import type { Database, DatabaseTransaction } from './index';

// By-id load of a single file upload, including its bytes. Used by the
// download HTTP route (which also handles authorization) and any future path
// that needs the raw payload — `chatMessageAiAdapter` reads attachments out of the
// joined-row payload instead, so it doesn't go through this loader.
export async function fileUploadLoad(dbOrTransaction: Database | DatabaseTransaction, fileUploadId: string): Promise<FileUpload | null> {
    const rows = await dbOrTransaction.select().from(fileUploads).where(eq(fileUploads.fileUploadId, fileUploadId)).limit(1);
    return rows[0] ?? null;
}
