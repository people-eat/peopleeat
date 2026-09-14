import { asc, eq, inArray } from 'drizzle-orm';

import { bookingRequestOfferEventAttachments, fileUploads } from './schema';
import type { FileUpload } from './schema';
import type { Database, DatabaseTransaction } from './index';

/** Bulk-load attachments for offer MESSAGE_SIMPLE events — one IN query, bucketed by event id. */
export async function offerEventAttachmentsByEventIdLoad(
    dbOrTx: Database | DatabaseTransaction,
    eventIds: ReadonlyArray<string>,
): Promise<Map<string, FileUpload[]>> {
    const byEventId = new Map<string, FileUpload[]>();
    if (eventIds.length === 0) return byEventId;

    const joinRows = await dbOrTx
        .select()
        .from(bookingRequestOfferEventAttachments)
        .innerJoin(fileUploads, eq(fileUploads.fileUploadId, bookingRequestOfferEventAttachments.fileUploadId))
        .where(inArray(bookingRequestOfferEventAttachments.bookingRequestOfferEventId, [...eventIds]))
        .orderBy(asc(bookingRequestOfferEventAttachments.position));

    for (const row of joinRows) {
        const eventId = row.BookingRequestOfferEventAttachments.bookingRequestOfferEventId;
        const list = byEventId.get(eventId) ?? [];
        list.push(row.FileUploads);
        byEventId.set(eventId, list);
    }

    return byEventId;
}
