import { eq } from 'drizzle-orm';

import { textNormalizeProseTitled, textNormalizeTitledOrNull } from '../../shared/textNormalize';
import { customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationCustomerTestimonialUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminCustomerTestimonialUpdate(
    { adminId }: GqlSAdminMutation,
    { customerTestimonialId, input }: GqlSAdminMutationCustomerTestimonialUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const set: Partial<typeof customerTestimonials.$inferInsert> = {};
        if (input.authorName !== undefined) set.authorName = textNormalizeTitledOrNull(input.authorName);
        if (input.location !== undefined) set.location = textNormalizeTitledOrNull(input.location);
        if (input.occasion !== undefined) set.occasion = textNormalizeTitledOrNull(input.occasion);
        if (input.rating !== undefined) set.rating = input.rating ?? null;
        if (input.body !== undefined) {
            const body = textNormalizeProseTitled(input.body ?? '');
            if (body.length === 0) {
                throw new Error('adminCustomerTestimonialUpdate: body must not be empty');
            }
            set.body = body;
        }

        if (Object.keys(set).length === 0) {
            throw new Error('adminCustomerTestimonialUpdate: at least one field is required');
        }

        const updated = await serverRuntime.db
            .update(customerTestimonials)
            .set(set)
            .where(eq(customerTestimonials.customerTestimonialId, customerTestimonialId))
            .returning({ customerTestimonialId: customerTestimonials.customerTestimonialId });
        if (updated.length === 0) {
            throw new Error('adminCustomerTestimonialUpdate: testimonial not found');
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: customerTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
