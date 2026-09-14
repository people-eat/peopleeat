import { eq } from 'drizzle-orm';

import { fileUploadLoad } from '../db/fileUploadLoad';
import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSFileUpload } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';

export async function cookLogoFindOne(cookId: string, serverRuntime: ServerRuntime): Promise<GqlSFileUpload | null> {
    const [row] = await serverRuntime.db
        .select({ logoFileUploadId: cooks.logoFileUploadId })
        .from(cooks)
        .where(eq(cooks.cookId, cookId))
        .limit(1);
    if (row?.logoFileUploadId == null) return null;
    const file = await fileUploadLoad(serverRuntime.db, row.logoFileUploadId);
    return file ? toGqlFileUpload(file) : null;
}
