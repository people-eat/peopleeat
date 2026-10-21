export interface ObjectStorageS3Credentials {
    accessKey: string;
    secret: string;
    region: string;
    endpoint: string;
    bucket: string;
    forcePathStyle: boolean;
}

/**
 * Shared Garage/S3 object store. First consumer: call-recording audio.
 * Future binary payloads that outgrow Postgres `FileUploads` use the same
 * bucket with a distinct key prefix — see docs/architecture/file-storage.md.
 */
export interface ObjectStorage {
    /** Always true when wired from boot-validated env; tests may stub false. */
    isConfigured: () => boolean;
    /** Credentials for LiveKit `EncodedFileOutput.s3` and the AWS SDK client. */
    s3Credentials: () => ObjectStorageS3Credentials;
    getObject: (objectKey: string) => Promise<{ body: Buffer; contentType: string | undefined; contentLength: number | undefined }>;
    /** Short-lived signed GET; prefer proxied admin routes in product UI. */
    signedGetUrl: (objectKey: string, expiresInSeconds?: number) => Promise<string>;
    /** Best-effort delete (e.g. failed call-recording cleanup). Missing keys are not an error. */
    deleteObject: (objectKey: string) => Promise<void>;
    /** Paginated `ListObjectsV2` for the admin file-store browse. */
    listObjects: (args: { prefix?: string; continuationToken?: string; maxKeys: number }) => Promise<{
        bucket: string;
        objects: Array<{
            key: string;
            size: number;
            lastModified: Date | undefined;
            etag: string | undefined;
        }>;
        nextContinuationToken: string | undefined;
        isTruncated: boolean;
    }>;
}
