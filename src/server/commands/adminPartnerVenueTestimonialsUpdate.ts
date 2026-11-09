import { eq, inArray } from 'drizzle-orm';

import { cookTestimonials, customerTestimonials, partnerVenues, partnerVenueTestimonials } from '../db/schema';
import type { PartnerVenueTestimonialCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationPartnerVenueTestimonialsUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminPartnerVenueTestimonialsUpdate(
    { adminId }: GqlSAdminMutation,
    { partnerVenueId, entries }: GqlSAdminMutationPartnerVenueTestimonialsUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const [venue] = await serverRuntime.db
            .select({ partnerVenueId: partnerVenues.partnerVenueId })
            .from(partnerVenues)
            .where(eq(partnerVenues.partnerVenueId, partnerVenueId))
            .limit(1);
        if (!venue) {
            throw new Error('adminPartnerVenueTestimonialsUpdate: partner venue not found');
        }

        const seen = new Set<string>();
        for (const entry of entries) {
            const key = `${entry.testimonialType}:${entry.testimonialId}`;
            if (seen.has(key)) {
                throw new Error('adminPartnerVenueTestimonialsUpdate: duplicate entry');
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
            throw new Error('adminPartnerVenueTestimonialsUpdate: testimonial not found');
        }

        const now = new Date();
        const rows: PartnerVenueTestimonialCreate[] = entries.map((entry, index) => ({
            partnerVenueId,
            testimonialType: entry.testimonialType,
            testimonialId: entry.testimonialId,
            index,
        }));

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.delete(partnerVenueTestimonials).where(eq(partnerVenueTestimonials.partnerVenueId, partnerVenueId));
            if (rows.length > 0) {
                await transaction.insert(partnerVenueTestimonials).values(rows);
            }
            await transaction.update(partnerVenues).set({ updatedAt: now }).where(eq(partnerVenues.partnerVenueId, partnerVenueId));
        });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: partnerVenueId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
