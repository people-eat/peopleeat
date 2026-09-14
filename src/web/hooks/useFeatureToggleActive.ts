import { createContext, useContext } from 'react';

import type { FeatureToggleKey } from '../../shared/featureToggle';
import { featureToggleIsActive } from '../../shared/featureToggle';

/** `null` outside a provider (e.g. admin) — treat toggles as on so publication UI stays visible. */
const FeatureToggleKeysContext = createContext<readonly FeatureToggleKey[] | null>(null);

export const FeatureToggleKeysProvider = FeatureToggleKeysContext.Provider;

/** True when the key is active, or when no profile feature-toggle context is mounted. */
export function useFeatureToggleActive(key: FeatureToggleKey): boolean {
    const keys = useContext(FeatureToggleKeysContext);
    if (keys == null) return true;
    return featureToggleIsActive(keys, key);
}
