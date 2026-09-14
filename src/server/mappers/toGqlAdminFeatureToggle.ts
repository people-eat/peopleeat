import type { FeatureToggleKey } from '../../shared/featureToggle';
import type { FeatureToggle } from '../db/schema';
import type { GqlSAdminFeatureToggle } from '../graphql/generated';

export function toGqlAdminFeatureToggle(row: FeatureToggle): GqlSAdminFeatureToggle {
    return {
        featureToggleKey: row.featureToggleKey,
        enabled: row.enabled,
        persisted: true,
        updatedAt: row.updatedAt,

        // resolved fields
        userOverrides: [],
    };
}

export function toGqlAdminFeatureToggleGhost(featureToggleKey: FeatureToggleKey): GqlSAdminFeatureToggle {
    return {
        featureToggleKey,
        enabled: false,
        persisted: false,
        updatedAt: null,

        // resolved fields
        userOverrides: [],
    };
}
