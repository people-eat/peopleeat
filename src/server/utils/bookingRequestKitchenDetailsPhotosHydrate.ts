import { asc, eq, inArray } from 'drizzle-orm';

import type { FileUploadMetadata } from '../db/fileUploadMetadata';
import { fileUploadMetadataColumns } from '../db/fileUploadMetadata';
import { bookingRequestKitchenDetailsPhotos, fileUploads } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSFileUpload } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';

export async function bookingRequestKitchenDetailsPhotosByRequestIdFind(
    serverRuntime: ServerRuntime,
    bookingRequestIds: readonly string[],
): Promise<Map<string, GqlSFileUpload[]>> {
    const byRequestId = new Map<string, GqlSFileUpload[]>();
    if (bookingRequestIds.length === 0) return byRequestId;

    const rows = await serverRuntime.db
        .select({
            bookingRequestId: bookingRequestKitchenDetailsPhotos.bookingRequestId,
            ...fileUploadMetadataColumns,
        })
        .from(bookingRequestKitchenDetailsPhotos)
        .innerJoin(fileUploads, eq(bookingRequestKitchenDetailsPhotos.fileUploadId, fileUploads.fileUploadId))
        .where(inArray(bookingRequestKitchenDetailsPhotos.bookingRequestId, [...bookingRequestIds]))
        .orderBy(asc(bookingRequestKitchenDetailsPhotos.position));

    for (const row of rows) {
        const metadata: FileUploadMetadata = {
            fileUploadId: row.fileUploadId,
            filename: row.filename,
            mediaType: row.mediaType,
            size: row.size,
        };
        const list = byRequestId.get(row.bookingRequestId) ?? [];
        list.push(toGqlFileUpload(metadata));
        byRequestId.set(row.bookingRequestId, list);
    }
    return byRequestId;
}
