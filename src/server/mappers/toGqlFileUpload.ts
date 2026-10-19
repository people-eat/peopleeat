import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { FileUploadMetadata } from '../db/fileUploadMetadata';
import type { GqlSFileUpload } from '../graphql/generated';

export function toGqlFileUpload(fileUpload: FileUploadMetadata): GqlSFileUpload {
    return {
        fileUploadId: fileUpload.fileUploadId,
        filename: fileUpload.filename,
        mediaType: fileUpload.mediaType,
        size: fileUpload.size,
        url: fileUploadPublicUrl(fileUpload.fileUploadId),
    };
}
