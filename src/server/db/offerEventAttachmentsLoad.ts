import { asc, eq, inArray } from 'drizzle-orm';

import type { FileUploadMetadata } from './fileUploadMetadata';
import { fileUploadMetadataColumns } from './fileUploadMetadata';
import { bookingRequestOfferEventAttachments, fileUploads } from './schema';
import type { Database, DatabaseTransaction } from './index';

/** Bulk-load attachment metadata for offer MESSAGE_SIMPLE events — one IN query, bucketed by event id. Never selects bytes. */
export async function offerEventAttachmentsByEventIdLoad(
    dbOrTx: Database | DatabaseTransaction,
    eventIds: ReadonlyArray<string>,
): Promise<Map<string, FileUploadMetadata[]>> {
    const byEventId = new Map<string, FileUploadMetadata[]>();
    if (eventIds.length === 0) return byEventId;

    const joinRows = await dbOrTx
        .select({
            bookingRequestOfferEventId: bookingRequestOfferEventAttachments.bookingRequestOfferEventId,
            ...fileUploadMetadataColumns,
        })
        .from(bookingRequestOfferEventAttachments)
        .innerJoin(fileUploads, eq(fileUploads.fileUploadId, bookingRequestOfferEventAttachments.fileUploadId))
        .where(inArray(bookingRequestOfferEventAttachments.bookingRequestOfferEventId, [...eventIds]))
        .orderBy(asc(bookingRequestOfferEventAttachments.position));

    for (const row of joinRows) {
        const list = byEventId.get(row.bookingRequestOfferEventId) ?? [];
        list.push({
            fileUploadId: row.fileUploadId,
            filename: row.filename,
            mediaType: row.mediaType,
            size: row.size,
        });
        byEventId.set(row.bookingRequestOfferEventId, list);
    }

    return byEventId;
}
