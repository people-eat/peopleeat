import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { Database, DatabaseTransaction } from '../db';
import { fileUploadAssertOwned, PROFILE_PICTURE_MEDIA_TYPES } from './fileUploadAssertOwned';

/**
 * Asserts every id is an image file upload owned by `userId`, then returns
 * the public `/api/file-uploads/{id}` URLs in the same order — same URL shape
 * as `heroImageUrl` / `imageUrl` elsewhere (see `fileUploadPublicUrl`).
 */
export async function testimonialImageUrlsFromFileUploadIds(
    dbOrTransaction: Database | DatabaseTransaction,
    args: {
        fileUploadIds: string[];
        userId: string;
        commandName: string;
    },
): Promise<string[]> {
    const urls: string[] = [];
    for (const fileUploadId of args.fileUploadIds) {
        await fileUploadAssertOwned(dbOrTransaction, {
            fileUploadId,
            userId: args.userId,
            allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
            commandName: args.commandName,
        });
        urls.push(fileUploadPublicUrl(fileUploadId));
    }
    return urls;
}
