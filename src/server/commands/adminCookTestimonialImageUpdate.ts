import { eq } from 'drizzle-orm';

import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationCookTestimonialImageUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

export async function adminCookTestimonialImageUpdate(
    { adminId }: GqlSAdminMutation,
    { cookTestimonialId, imageFileUploadIds }: GqlSAdminMutationCookTestimonialImageUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: imageFileUploadIds,
            userId: adminId,
            commandName: 'adminCookTestimonialImageUpdate',
        });

        const updated = await serverRuntime.db
            .update(cookTestimonials)
            .set({ imageUrls })
            .where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId))
            .returning({ cookTestimonialId: cookTestimonials.cookTestimonialId });
        if (updated.length === 0) {
            throw new Error('adminCookTestimonialImageUpdate: testimonial not found');
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: cookTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
