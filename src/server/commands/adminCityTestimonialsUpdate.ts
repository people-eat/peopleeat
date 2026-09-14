import { eq, inArray } from 'drizzle-orm';

import { cities, cityTestimonials, cookTestimonials, customerTestimonials } from '../db/schema';
import type { CityTestimonialCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCityTestimonialsUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminCityTestimonialsUpdate(
    { adminId }: GqlSAdminMutation,
    { cityId, entries }: GqlSAdminMutationCityTestimonialsUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        // Phase 1 — validate + build payload
        const [city] = await serverRuntime.db.select({ cityId: cities.cityId }).from(cities).where(eq(cities.cityId, cityId)).limit(1);
        if (!city) {
            throw new Error('adminCityTestimonialsUpdate: city not found');
        }

        const seen = new Set<string>();
        for (const entry of entries) {
            const key = `${entry.testimonialType}:${entry.testimonialId}`;
            if (seen.has(key)) {
                throw new Error('adminCityTestimonialsUpdate: duplicate entry');
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
            throw new Error('adminCityTestimonialsUpdate: testimonial not found');
        }

        const now = new Date();
        const rows: CityTestimonialCreate[] = entries.map((entry, index) => ({
            cityId,
            testimonialType: entry.testimonialType,
            testimonialId: entry.testimonialId,
            index,
        }));

        // Phase 2 — replace assignment in a transaction
        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.delete(cityTestimonials).where(eq(cityTestimonials.cityId, cityId));
            if (rows.length > 0) {
                await transaction.insert(cityTestimonials).values(rows);
            }
            await transaction.update(cities).set({ updatedAt: now }).where(eq(cities.cityId, cityId));
        });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: cityId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
