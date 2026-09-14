import { featureToggleKeys } from '../../shared/featureToggle';
import { featureToggles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminFeatureToggle } from '../graphql/generated';
import { toGqlAdminFeatureToggle, toGqlAdminFeatureToggleGhost } from '../mappers/toGqlAdminFeatureToggle';

export async function adminFeatureToggleFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminFeatureToggle[]> {
    const rows = await serverRuntime.db.select().from(featureToggles);
    const byKey = new Map(rows.map((row) => [row.featureToggleKey, row]));

    return featureToggleKeys.map((featureToggleKey) => {
        const row = byKey.get(featureToggleKey);
        return row ? toGqlAdminFeatureToggle(row) : toGqlAdminFeatureToggleGhost(featureToggleKey);
    });
}
