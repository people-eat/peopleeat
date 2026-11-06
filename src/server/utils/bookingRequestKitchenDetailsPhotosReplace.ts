import { eq, inArray } from 'drizzle-orm';

import { fileUploadImageMediaTypeAllowed } from '../../shared/fileUploadMediaTypes';
import type { Database, DatabaseTransaction } from '../db';
import { bookingRequestKitchenDetailsPhotos, fileUploads } from '../db/schema';
import type { BookingRequestKitchenDetailsPhotoCreate } from '../db/schema';
import { fileUploadIdsAssertOwned } from './fileUploadIdsAssertOwned';

export async function bookingRequestKitchenDetailsPhotosReplace(
    dbOrTx: Database | DatabaseTransaction,
    args: {
        bookingRequestId: string;
        userId: string;
        fileUploadIds: readonly string[];
        commandName: string;
    },
): Promise<void> {
    const fileUploadIds = await fileUploadIdsAssertOwned(dbOrTx, {
        userId: args.userId,
        fileUploadIds: args.fileUploadIds,
        commandName: args.commandName,
    });

    if (fileUploadIds.length > 0) {
        const rows = await dbOrTx
            .select({ fileUploadId: fileUploads.fileUploadId, mediaType: fileUploads.mediaType })
            .from(fileUploads)
            .where(inArray(fileUploads.fileUploadId, fileUploadIds));
        const mediaById = new Map(rows.map((row) => [row.fileUploadId, row.mediaType]));
        for (const fileUploadId of fileUploadIds) {
            const mediaType = mediaById.get(fileUploadId);
            if (mediaType == null || !fileUploadImageMediaTypeAllowed(mediaType)) {
                throw new Error(`${args.commandName}: kitchen details photos must be images`);
            }
        }
    }

    await dbOrTx
        .delete(bookingRequestKitchenDetailsPhotos)
        .where(eq(bookingRequestKitchenDetailsPhotos.bookingRequestId, args.bookingRequestId));

    if (fileUploadIds.length === 0) return;

    const inserts: BookingRequestKitchenDetailsPhotoCreate[] = fileUploadIds.map((fileUploadId, position) => ({
        bookingRequestId: args.bookingRequestId,
        fileUploadId,
        position,
    }));
    await dbOrTx.insert(bookingRequestKitchenDetailsPhotos).values(inserts);
}
