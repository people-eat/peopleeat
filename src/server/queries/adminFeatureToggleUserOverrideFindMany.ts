import { eq } from 'drizzle-orm';

import { featureToggleKeys } from '../../shared/featureToggle';
import type { FeatureToggleKey } from '../../shared/featureToggle';
import { featureToggleUserOverrides } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminFeatureToggleUserOverride, GqlSAdminUser } from '../graphql/generated';
import { toGqlAdminFeatureToggleUserOverride } from '../mappers/toGqlAdminFeatureToggleUserOverride';

/** Persisted feature-toggle overrides for an admin user detail. */
export async function adminFeatureToggleUserOverrideFindMany(
    parent: GqlSAdminUser,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminFeatureToggleUserOverride[]> {
    const known = new Set<string>(featureToggleKeys);
    const rows = await serverRuntime.db
        .select()
        .from(featureToggleUserOverrides)
        .where(eq(featureToggleUserOverrides.userId, parent.userId));

    return rows
        .filter((row): row is typeof row & { featureToggleKey: FeatureToggleKey } => known.has(row.featureToggleKey))
        .map(toGqlAdminFeatureToggleUserOverride);
}
