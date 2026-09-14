import { and, eq } from 'drizzle-orm';

import type { FeatureToggleKey } from '../../shared/featureToggle';
import { featureToggles, featureToggleUserOverrides } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/**
 * True when the key is effectively enabled for `userId`.
 * Override row wins when present; otherwise global row (`enabled: true`).
 * Missing global row is disabled. Anonymous callers (`userId` null/undefined)
 * use the global default only.
 */
export async function featureToggleIsEnabled(
    featureToggleKey: FeatureToggleKey,
    serverRuntime: ServerRuntime,
    userId?: string | null,
): Promise<boolean> {
    if (userId) {
        const [override] = await serverRuntime.db
            .select({ enabled: featureToggleUserOverrides.enabled })
            .from(featureToggleUserOverrides)
            .where(and(eq(featureToggleUserOverrides.userId, userId), eq(featureToggleUserOverrides.featureToggleKey, featureToggleKey)))
            .limit(1);
        if (override) {
            return override.enabled;
        }
    }

    const [row] = await serverRuntime.db
        .select({ enabled: featureToggles.enabled })
        .from(featureToggles)
        .where(eq(featureToggles.featureToggleKey, featureToggleKey))
        .limit(1);
    return row?.enabled === true;
}
