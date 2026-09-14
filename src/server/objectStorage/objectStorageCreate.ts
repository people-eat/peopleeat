import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { ObjectStorage, ObjectStorageS3Credentials } from './ObjectStorage';

export interface ObjectStorageCreateOptions {
    bucket: string;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
}

export function objectStorageCreate(options: ObjectStorageCreateOptions): ObjectStorage {
    let client: S3Client | undefined;

    function credentials(): ObjectStorageS3Credentials {
        return {
            accessKey: options.accessKeyId,
            secret: options.secretAccessKey,
            region: options.region,
            endpoint: options.endpoint,
            bucket: options.bucket,
            forcePathStyle: options.forcePathStyle,
        };
    }

    function clientRequire(): S3Client {
        const s3 = credentials();
        client ??= new S3Client({
            region: s3.region,
            endpoint: s3.endpoint,
            forcePathStyle: s3.forcePathStyle,
            credentials: {
                accessKeyId: s3.accessKey,
                secretAccessKey: s3.secret,
            },
        });
        return client;
    }

    return {
        // Boot requires OBJECT_STORAGE_S3_*; always true in production wiring.
        // Tests may still stub `isConfigured` on ServerRuntime to false.
        isConfigured: () => true,
        s3Credentials: () => credentials(),
        getObject: async (objectKey) => {
            const s3 = credentials();
            const response = await clientRequire().send(
                new GetObjectCommand({
                    Bucket: s3.bucket,
                    Key: objectKey,
                }),
            );
            const bytes = response.Body ? Buffer.from(await response.Body.transformToByteArray()) : Buffer.alloc(0);
            return {
                body: bytes,
                contentType: response.ContentType,
                contentLength: response.ContentLength,
            };
        },
        signedGetUrl: async (objectKey, expiresInSeconds = 3600) => {
            const s3 = credentials();
            return getSignedUrl(
                clientRequire(),
                new GetObjectCommand({
                    Bucket: s3.bucket,
                    Key: objectKey,
                }),
                { expiresIn: expiresInSeconds },
            );
        },
        listObjects: async ({ prefix, continuationToken, maxKeys }) => {
            const s3 = credentials();
            const response = await clientRequire().send(
                new ListObjectsV2Command({
                    Bucket: s3.bucket,
                    Prefix: prefix || undefined,
                    ContinuationToken: continuationToken || undefined,
                    MaxKeys: maxKeys,
                }),
            );
            return {
                bucket: s3.bucket,
                objects: (response.Contents ?? [])
                    .filter((entry): entry is typeof entry & { Key: string } => typeof entry.Key === 'string' && entry.Key.length > 0)
                    .map((entry) => ({
                        key: entry.Key,
                        size: entry.Size ?? 0,
                        lastModified: entry.LastModified,
                        etag: entry.ETag,
                    })),
                nextContinuationToken: response.NextContinuationToken,
                isTruncated: response.IsTruncated === true,
            };
        },
    };
}
