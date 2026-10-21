import { eq } from 'drizzle-orm';

import { textNormalizeProseTitled, textNormalizeTitledOrNull } from '../../shared/textNormalize';
import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookTestimonialUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminCookTestimonialUpdate(
    { adminId }: GqlSAdminMutation,
    { cookTestimonialId, input }: GqlSAdminMutationCookTestimonialUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const set: Partial<typeof cookTestimonials.$inferInsert> = {};
        if (input.authorName !== undefined) set.authorName = textNormalizeTitledOrNull(input.authorName);
        if (input.location !== undefined) set.location = textNormalizeTitledOrNull(input.location);
        if (input.occasion !== undefined) set.occasion = textNormalizeTitledOrNull(input.occasion);
        if (input.rating !== undefined) set.rating = input.rating ?? null;
        if (input.body !== undefined) set.body = input.body == null ? null : textNormalizeProseTitled(input.body) || null;

        if (Object.keys(set).length === 0) {
            throw new Error('adminCookTestimonialUpdate: at least one field is required');
        }

        const updated = await serverRuntime.db
            .update(cookTestimonials)
            .set(set)
            .where(eq(cookTestimonials.cookTestimonialId, cookTestimonialId))
            .returning({ cookTestimonialId: cookTestimonials.cookTestimonialId });
        if (updated.length === 0) {
            throw new Error('adminCookTestimonialUpdate: testimonial not found');
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: cookTestimonialId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
