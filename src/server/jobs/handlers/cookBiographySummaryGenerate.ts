import { eq } from 'drizzle-orm';

import { cookBiographySummaryGenerate as cookBiographySummaryGenerateRun } from '../../commands/cookBiographySummaryGenerate';
import { cooks } from '../../db/schema';
import type { QueuedJobDefinition } from '../types';

interface CookBiographySummaryGenerateData {
    cookId: string;
}

export const cookBiographySummaryGenerate: QueuedJobDefinition<CookBiographySummaryGenerateData> = {
    kind: 'queued',
    name: 'cook-biography-summary-generate',
    handler: async ({ data, serverRuntime }) => {
        try {
            const [cook] = await serverRuntime.db
                .select({
                    biography: cooks.biography,
                    cuisineStyle: cooks.cuisineStyle,
                    cookingPhilosophy: cooks.cookingPhilosophy,
                })
                .from(cooks)
                .where(eq(cooks.cookId, data.cookId))
                .limit(1);

            if (!cook) {
                serverRuntime.log.warn(`cookBiographySummaryGenerate: cook ${data.cookId} not found`);
                return;
            }

            const trimmedBiography = cook.biography.trim();
            if (!trimmedBiography) {
                await serverRuntime.db
                    .update(cooks)
                    .set({ biographySummary: '', lastModifiedAt: new Date() })
                    .where(eq(cooks.cookId, data.cookId));
                await serverRuntime.publish.userUpdates({ userId: data.cookId });
                return;
            }

            const biographySummary = await cookBiographySummaryGenerateRun({
                cookId: data.cookId,
                biography: trimmedBiography,
                cuisineStyle: cook.cuisineStyle,
                cookingPhilosophy: cook.cookingPhilosophy,
                requestingSession: null,
                serverRuntime,
            });

            if (!biographySummary) {
                return;
            }

            await serverRuntime.db.update(cooks).set({ biographySummary, lastModifiedAt: new Date() }).where(eq(cooks.cookId, data.cookId));
            await serverRuntime.publish.userUpdates({ userId: data.cookId });
        } catch (error) {
            serverRuntime.log.error(error, null);
        }
    },
    options: {
        retryLimit: 2,
        retryDelay: 30,
        expireInSeconds: 120,
    },
};
