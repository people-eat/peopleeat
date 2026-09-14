import { eq } from 'drizzle-orm';

import { customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationCustomerTestimonialPublishArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminCustomerTestimonialPublish(
    { adminId }: GqlSAdminMutation,
    { customerTestimonialId, publicationStatus }: GqlSAdminMutationCustomerTestimonialPublishArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const updated = await serverRuntime.db
            .update(customerTestimonials)
            .set({ publicationStatus, publishedAt: publicationStatus === 'PUBLISHED' ? new Date() : null })
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId))
            .returning({ customerTestimonialId: customerTestimonials.customerTestimonialId });
        if (updated.length === 0) {
            throw new Error('adminCustomerTestimonialPublish: testimonial not found');
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: customerTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
