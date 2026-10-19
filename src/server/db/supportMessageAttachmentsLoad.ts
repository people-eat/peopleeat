import { asc, eq, inArray } from 'drizzle-orm';

import type { FileUploadMetadata } from './fileUploadMetadata';
import { fileUploadMetadataColumns } from './fileUploadMetadata';
import { fileUploads, supportRequestMessageAttachments } from './schema';
import type { Database, DatabaseTransaction } from './index';

/** Bulk-load attachment metadata for support messages — one IN query, bucketed by message id. Never selects bytes. */
export async function supportMessageAttachmentsByMessageIdLoad(
    dbOrTx: Database | DatabaseTransaction,
    messageIds: ReadonlyArray<string>,
): Promise<Map<string, FileUploadMetadata[]>> {
    const byMessageId = new Map<string, FileUploadMetadata[]>();
    if (messageIds.length === 0) return byMessageId;

    const joinRows = await dbOrTx
        .select({
            supportRequestMessageId: supportRequestMessageAttachments.supportRequestMessageId,
            ...fileUploadMetadataColumns,
        })
        .from(supportRequestMessageAttachments)
        .innerJoin(fileUploads, eq(fileUploads.fileUploadId, supportRequestMessageAttachments.fileUploadId))
        .where(inArray(supportRequestMessageAttachments.supportRequestMessageId, [...messageIds]))
        .orderBy(asc(supportRequestMessageAttachments.position));

    for (const row of joinRows) {
        const list = byMessageId.get(row.supportRequestMessageId) ?? [];
        list.push({
            fileUploadId: row.fileUploadId,
            filename: row.filename,
            mediaType: row.mediaType,
            size: row.size,
        });
        byMessageId.set(row.supportRequestMessageId, list);
    }

    return byMessageId;
}
