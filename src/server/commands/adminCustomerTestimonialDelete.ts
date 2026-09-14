import { eq } from 'drizzle-orm';

import { customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationCustomerTestimonialDeleteArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { testimonialJunctionRowsDelete } from '../utils/testimonialJunctionRowsDelete';

export async function adminCustomerTestimonialDelete(
    { adminId }: GqlSAdminMutation,
    { customerTestimonialId }: GqlSAdminMutationCustomerTestimonialDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const deleted = await serverRuntime.db.transaction(async (transaction) => {
            await testimonialJunctionRowsDelete(transaction, { testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId });
            return transaction
                .delete(customerTestimonials)
                .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId))
                .returning({ customerTestimonialId: customerTestimonials.customerTestimonialId });
        });
        if (deleted.length === 0) {
            throw new Error('adminCustomerTestimonialDelete: testimonial not found');
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: customerTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
