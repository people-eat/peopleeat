import { asc, eq, inArray } from 'drizzle-orm';

import { fileUploads, supportRequestMessageAttachments } from './schema';
import type { FileUpload } from './schema';
import type { Database, DatabaseTransaction } from './index';

/** Bulk-load attachments for support messages — one IN query, bucketed by message id. */
export async function supportMessageAttachmentsByMessageIdLoad(
    dbOrTx: Database | DatabaseTransaction,
    messageIds: ReadonlyArray<string>,
): Promise<Map<string, FileUpload[]>> {
    const byMessageId = new Map<string, FileUpload[]>();
    if (messageIds.length === 0) return byMessageId;

    const joinRows = await dbOrTx
        .select()
        .from(supportRequestMessageAttachments)
        .innerJoin(fileUploads, eq(fileUploads.fileUploadId, supportRequestMessageAttachments.fileUploadId))
        .where(inArray(supportRequestMessageAttachments.supportRequestMessageId, [...messageIds]))
        .orderBy(asc(supportRequestMessageAttachments.position));

    for (const row of joinRows) {
        const messageId = row.SupportRequestMessageAttachments.supportRequestMessageId;
        const list = byMessageId.get(messageId) ?? [];
        list.push(row.FileUploads);
        byMessageId.set(messageId, list);
    }

    return byMessageId;
}
