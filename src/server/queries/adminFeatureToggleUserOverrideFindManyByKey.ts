import { eq } from 'drizzle-orm';

import { featureToggleUserOverrides } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminFeatureToggle, GqlSAdminFeatureToggleUserOverride } from '../graphql/generated';
import { toGqlAdminFeatureToggleUserOverride } from '../mappers/toGqlAdminFeatureToggleUserOverride';

/** Persisted overrides for one feature toggle key (global admin toggles page). */
export async function adminFeatureToggleUserOverrideFindManyByKey(
    parent: GqlSAdminFeatureToggle,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminFeatureToggleUserOverride[]> {
    const rows = await serverRuntime.db
        .select()
        .from(featureToggleUserOverrides)
        .where(eq(featureToggleUserOverrides.featureToggleKey, parent.featureToggleKey));

    return rows.map(toGqlAdminFeatureToggleUserOverride);
}
