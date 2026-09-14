import { asc, eq } from 'drizzle-orm';

import type { Database } from '../db';
import { fileUploads, outboundEmailAttachments } from '../db/schema';
import type { GqlSFileUpload } from '../graphql/generated';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';

/** Load FileUpload GraphQL shapes attached to an outbound email, in send order. */
export async function outboundEmailAttachmentsFindMany(db: Database, outboundEmailId: string): Promise<GqlSFileUpload[]> {
    const rows = await db
        .select({
            fileUploadId: fileUploads.fileUploadId,
            filename: fileUploads.filename,
            mediaType: fileUploads.mediaType,
            size: fileUploads.size,
        })
        .from(outboundEmailAttachments)
        .innerJoin(fileUploads, eq(outboundEmailAttachments.fileUploadId, fileUploads.fileUploadId))
        .where(eq(outboundEmailAttachments.outboundEmailId, outboundEmailId))
        .orderBy(asc(outboundEmailAttachments.position));

    return rows.map(toGqlFileUpload);
}
