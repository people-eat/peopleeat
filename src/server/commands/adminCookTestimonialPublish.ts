import { eq } from 'drizzle-orm';

import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookTestimonialPublishArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminCookTestimonialPublish(
    { adminId }: GqlSAdminMutation,
    { cookTestimonialId, publicationStatus }: GqlSAdminMutationCookTestimonialPublishArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const updated = await serverRuntime.db
            .update(cookTestimonials)
            .set({ publicationStatus, publishedAt: publicationStatus === 'PUBLISHED' ? new Date() : null })
            .where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId))
            .returning({ cookTestimonialId: cookTestimonials.cookTestimonialId });
        if (updated.length === 0) {
            throw new Error('adminCookTestimonialPublish: testimonial not found');
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: cookTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
