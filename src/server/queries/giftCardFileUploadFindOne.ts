import { fileUploadMetadataLoad } from '../db/fileUploadMetadata';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSFileUpload } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';

/** Shared file-upload resolver for gift-card PDF FKs (invoice / voucher). Never selects bytes. */
export async function giftCardFileUploadFindOne(
    fileUploadId: string | null | undefined,
    serverRuntime: ServerRuntime,
): Promise<GqlSFileUpload | null> {
    if (!fileUploadId) {
        return null;
    }
    const row = await fileUploadMetadataLoad(serverRuntime.db, fileUploadId);
    return row ? toGqlFileUpload(row) : null;
}
