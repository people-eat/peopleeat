import { eq } from 'drizzle-orm';

import { customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationCustomerTestimonialImageUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { testimonialImageUrlsFromFileUploadIds } from '../utils/testimonialImageUrlsFromFileUploadIds';

export async function adminCustomerTestimonialImageUpdate(
    { adminId }: GqlSAdminMutation,
    { customerTestimonialId, imageFileUploadIds }: GqlSAdminMutationCustomerTestimonialImageUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const imageUrls = await testimonialImageUrlsFromFileUploadIds(serverRuntime.db, {
            fileUploadIds: imageFileUploadIds,
            userId: adminId,
            commandName: 'adminCustomerTestimonialImageUpdate',
        });

        const updated = await serverRuntime.db
            .update(customerTestimonials)
            .set({ imageUrls })
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId))
            .returning({ customerTestimonialId: customerTestimonials.customerTestimonialId });
        if (updated.length === 0) {
            throw new Error('adminCustomerTestimonialImageUpdate: testimonial not found');
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: customerTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
