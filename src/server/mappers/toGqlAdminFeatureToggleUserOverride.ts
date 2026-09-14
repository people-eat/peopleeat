import type { FeatureToggleUserOverride } from '../db/schema';
import type { GqlSAdminFeatureToggleUserOverride, GqlSAdminUser } from '../graphql/generated';

export function toGqlAdminFeatureToggleUserOverride(row: FeatureToggleUserOverride): GqlSAdminFeatureToggleUserOverride {
    return {
        userId: row.userId,
        featureToggleKey: row.featureToggleKey,
        enabled: row.enabled,
        updatedAt: row.updatedAt,

        // resolved fields
        user: undefined as unknown as GqlSAdminUser,
    };
}
