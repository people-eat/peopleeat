import { eq, inArray } from 'drizzle-orm';

import { cities, cityCooks, cooks } from '../db/schema';
import type { CityCookCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCityCooksUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminCityCooksUpdate(
    { adminId }: GqlSAdminMutation,
    { cityId, cookIds }: GqlSAdminMutationCityCooksUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        // Phase 1 — validate + build payloads
        const [city] = await serverRuntime.db.select({ cityId: cities.cityId }).from(cities).where(eq(cities.cityId, cityId)).limit(1);
        if (!city) {
            throw new Error('adminCityCooksUpdate: city not found');
        }

        const uniqueCookIds = [...new Set(cookIds)];
        if (uniqueCookIds.length !== cookIds.length) {
            throw new Error('adminCityCooksUpdate: duplicate cook ids');
        }

        if (cookIds.length > 0) {
            const existing = await serverRuntime.db.select({ cookId: cooks.cookId }).from(cooks).where(inArray(cooks.cookId, cookIds));
            if (existing.length !== cookIds.length) {
                throw new Error('adminCityCooksUpdate: cook not found');
            }
        }

        const now = new Date();
        const rows: CityCookCreate[] = cookIds.map((cookId, position) => ({
            cityId,
            cookId,
            position,
        }));

        // Phase 2 — replace assignment in a transaction
        await serverRuntime.db.transaction(async (tx) => {
            await tx.delete(cityCooks).where(eq(cityCooks.cityId, cityId));
            if (rows.length > 0) {
                await tx.insert(cityCooks).values(rows);
            }
            await tx.update(cities).set({ updatedAt: now }).where(eq(cities.cityId, cityId));
        });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: cityId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
