import { createContext, useContext } from 'react';

import type { FeatureToggleKey } from '../../shared/featureToggle';
import { featureToggleIsActive } from '../../shared/featureToggle';

/** `null` outside a provider (e.g. public pages) — treat toggles as on for ops-style UI. */
const FeatureToggleKeysContext = createContext<readonly FeatureToggleKey[] | null>(null);

/**
 * True inside `AdminLayout`. Ops surfaces (publication badges, restrictions editor) stay
 * visible there even when the end-user toggle is off; product surfaces that should follow
 * the toggle in admin pass `gateInAdminShell: true`.
 */
const FeatureToggleAdminShellContext = createContext(false);

export const FeatureToggleKeysProvider = FeatureToggleKeysContext.Provider;
export const FeatureToggleAdminShellProvider = FeatureToggleAdminShellContext.Provider;

export function useFeatureToggleActive(
    key: FeatureToggleKey,
    options?: {
        /**
         * When true, admin shells respect the session’s effective keys (same as profile).
         * Default false: admin ops UI stays available while the end-user rollout is off.
         */
        gateInAdminShell?: boolean;
    },
): boolean {
    const keys = useContext(FeatureToggleKeysContext);
    const isAdminShell = useContext(FeatureToggleAdminShellContext);
    const gateInAdminShell = options?.gateInAdminShell === true;

    if (isAdminShell && !gateInAdminShell) {
        return true;
    }
    if (keys == null) {
        // No provider: ops-style default on; gated product surfaces stay off until keys exist.
        return !gateInAdminShell;
    }
    return featureToggleIsActive(keys, key);
}
