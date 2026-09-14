import { eq } from 'drizzle-orm';

import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookTestimonialDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { testimonialJunctionRowsDelete } from '../utils/testimonialJunctionRowsDelete';

export async function adminCookTestimonialDelete(
    { adminId }: GqlSAdminMutation,
    { cookTestimonialId }: GqlSAdminMutationCookTestimonialDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const deleted = await serverRuntime.db.transaction(async (transaction) => {
            await testimonialJunctionRowsDelete(transaction, { testimonialType: 'COOK', testimonialId: cookTestimonialId });
            return transaction
                .delete(cookTestimonials)
                .where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId))
                .returning({ cookTestimonialId: cookTestimonials.cookTestimonialId });
        });
        if (deleted.length === 0) {
            throw new Error('adminCookTestimonialDelete: testimonial not found');
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: cookTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
