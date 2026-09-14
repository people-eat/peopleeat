import { eq, inArray } from 'drizzle-orm';

import { cookTestimonials, customerTestimonials, partners, partnerTestimonials } from '../db/schema';
import type { PartnerTestimonialCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationPartnerTestimonialsUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminPartnerTestimonialsUpdate(
    { adminId }: GqlSAdminMutation,
    { partnerId, entries }: GqlSAdminMutationPartnerTestimonialsUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        // Phase 1 — validate + build payload
        const [partner] = await serverRuntime.db
            .select({ partnerId: partners.partnerId })
            .from(partners)
            .where(eq(partners.partnerId, partnerId))
            .limit(1);
        if (!partner) {
            throw new Error('adminPartnerTestimonialsUpdate: partner not found');
        }

        const seen = new Set<string>();
        for (const entry of entries) {
            const key = `${entry.testimonialType}:${entry.testimonialId}`;
            if (seen.has(key)) {
                throw new Error('adminPartnerTestimonialsUpdate: duplicate entry');
            }
            seen.add(key);
        }

        const customerIds = entries.filter((entry) => entry.testimonialType === 'CUSTOMER').map((entry) => entry.testimonialId);
        const cookIds = entries.filter((entry) => entry.testimonialType === 'COOK').map((entry) => entry.testimonialId);
        const [existingCustomer, existingCook] = await Promise.all([
            customerIds.length > 0
                ? serverRuntime.db
                      .select({ customerTestimonialId: customerTestimonials.customerTestimonialId })
                      .from(customerTestimonials)
                      .where(inArray(customerTestimonials.customerTestimonialId, customerIds))
                : Promise.resolve([]),
            cookIds.length > 0
                ? serverRuntime.db
                      .select({ cookTestimonialId: cookTestimonials.cookTestimonialId })
                      .from(cookTestimonials)
                      .where(inArray(cookTestimonials.cookTestimonialId, cookIds))
                : Promise.resolve([]),
        ]);
        if (existingCustomer.length !== customerIds.length || existingCook.length !== cookIds.length) {
            throw new Error('adminPartnerTestimonialsUpdate: testimonial not found');
        }

        const now = new Date();
        const rows: PartnerTestimonialCreate[] = entries.map((entry, index) => ({
            partnerId,
            testimonialType: entry.testimonialType,
            testimonialId: entry.testimonialId,
            index,
        }));

        // Phase 2 — replace assignment in a transaction
        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.delete(partnerTestimonials).where(eq(partnerTestimonials.partnerId, partnerId));
            if (rows.length > 0) {
                await transaction.insert(partnerTestimonials).values(rows);
            }
            await transaction.update(partners).set({ updatedAt: now }).where(eq(partners.partnerId, partnerId));
        });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: partnerId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
