import { t } from '../../../i18n/t';
import type { FeatureToggleKey } from '../../../shared/featureToggle';
import type { Locale } from '../../utils/locale';

export type AdminFeatureToggleOverrideMode = 'default' | 'user-on' | 'user-off';

export function adminFeatureToggleLabel(featureToggleKey: FeatureToggleKey, locale: Locale): string {
    return t(locale, 'admin', `featureToggles.labels.${featureToggleKey}`);
}

export function adminFeatureToggleDescription(featureToggleKey: FeatureToggleKey, locale: Locale): string {
    return t(locale, 'admin', `featureToggles.descriptions.${featureToggleKey}`);
}

export function adminFeatureToggleOverrideModeFromEnabled(enabled: boolean | undefined): AdminFeatureToggleOverrideMode {
    if (enabled === true) return 'user-on';
    if (enabled === false) return 'user-off';
    return 'default';
}

export function adminFeatureToggleOverrideModeLabel(mode: AdminFeatureToggleOverrideMode, locale: Locale): string {
    return t(locale, 'admin', `featureToggles.overrideModes.${mode}`);
}
