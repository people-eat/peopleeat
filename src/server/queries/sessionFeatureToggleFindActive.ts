import { eq } from 'drizzle-orm';

import { featureToggleKeys } from '../../shared/featureToggle';
import type { FeatureToggleKey } from '../../shared/featureToggle';
import { featureToggles, featureToggleUserOverrides } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/** Effective enabled feature toggle keys for `Session.activeFeatureToggleKeys`. */
export async function sessionFeatureToggleFindActive(serverRuntime: ServerRuntime, userId?: string | null): Promise<FeatureToggleKey[]> {
    const known = new Set<string>(featureToggleKeys);
    const globalRows = await serverRuntime.db
        .select({
            featureToggleKey: featureToggles.featureToggleKey,
            enabled: featureToggles.enabled,
        })
        .from(featureToggles);

    const enabled = new Set<FeatureToggleKey>();
    for (const row of globalRows) {
        if (row.enabled && known.has(row.featureToggleKey)) {
            enabled.add(row.featureToggleKey);
        }
    }

    if (userId) {
        const overrides = await serverRuntime.db
            .select({
                featureToggleKey: featureToggleUserOverrides.featureToggleKey,
                enabled: featureToggleUserOverrides.enabled,
            })
            .from(featureToggleUserOverrides)
            .where(eq(featureToggleUserOverrides.userId, userId));

        for (const override of overrides) {
            if (!known.has(override.featureToggleKey)) continue;
            if (override.enabled) {
                enabled.add(override.featureToggleKey);
            } else {
                enabled.delete(override.featureToggleKey);
            }
        }
    }

    return featureToggleKeys.filter((key) => enabled.has(key));
}
