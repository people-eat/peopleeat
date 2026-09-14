import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminObjectStorageObjectPage, GqlSAdminObjectStorageObjectsArgs, GqlSSession } from '../graphql/generated';
import { findManyTake } from '../utils/findManyTake';

export async function adminObjectStorageObjectFindMany(
    args: GqlSAdminObjectStorageObjectsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminObjectStorageObjectPage> {
    try {
        if (!serverRuntime.objectStorage.isConfigured()) {
            return {
                configured: false,
                bucket: null,
                objects: [],
                nextContinuationToken: null,
                isTruncated: false,
            };
        }

        const page = await serverRuntime.objectStorage.listObjects({
            prefix: args.criterion.prefix?.trim() || undefined,
            continuationToken: args.criterion.continuationToken?.trim() || undefined,
            maxKeys: findManyTake(args.criterion.take),
        });

        return {
            configured: true,
            bucket: page.bucket,
            objects: page.objects.map((object) => ({
                key: object.key,
                size: object.size,
                lastModified: object.lastModified ?? null,
                etag: object.etag ?? null,
            })),
            nextContinuationToken: page.nextContinuationToken ?? null,
            isTruncated: page.isTruncated,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
