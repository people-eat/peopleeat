import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { FileUpload } from '../db/schema';
import type { GqlSFileUpload } from '../graphql/generated';

export function toGqlFileUpload(fileUpload: Pick<FileUpload, 'fileUploadId' | 'filename' | 'mediaType' | 'size'>): GqlSFileUpload {
    return {
        fileUploadId: fileUpload.fileUploadId,
        filename: fileUpload.filename,
        mediaType: fileUpload.mediaType,
        size: fileUpload.size,
        url: fileUploadPublicUrl(fileUpload.fileUploadId),
    };
}
