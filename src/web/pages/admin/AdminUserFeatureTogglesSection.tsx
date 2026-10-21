import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { formatDate } from '../../../shared';
import { featureToggleKeys } from '../../../shared/featureToggle';
import type { FeatureToggleKey } from '../../../shared/featureToggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { StatusBadge } from '../../components/base/status-badge';
import type { GqlCAdminUserPageQuery, GqlCFeatureToggleKey } from '../../graphql/generated';
import {
    AdminUserFeatureToggleUserOverrideDeleteDocument,
    AdminUserFeatureToggleUserOverrideUpsertDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import {
    adminFeatureToggleLabel,
    adminFeatureToggleOverrideModeFromEnabled,
    adminFeatureToggleOverrideModeLabel,
} from './adminFeatureToggles';
import type { AdminFeatureToggleOverrideMode } from './adminFeatureToggles';
import { adminOverviewCardClassName } from './adminOverviewLinkCard';

type AdminUserRow = NonNullable<NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['user']>;
type GlobalFeatureToggle = NonNullable<
    NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['featureToggles']
>[number];

export function AdminUserFeatureTogglesSection({
    user,
    globalFeatureToggles,
}: {
    user: AdminUserRow;
    globalFeatureToggles: readonly GlobalFeatureToggle[];
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const router = useRouter();
    const [, upsertOverride] = useMutation(AdminUserFeatureToggleUserOverrideUpsertDocument);
    const [, deleteOverride] = useMutation(AdminUserFeatureToggleUserOverrideDeleteDocument);
    const [busyKey, setBusyKey] = useState<GqlCFeatureToggleKey | null>(null);

    const globalByKey = new Map(globalFeatureToggles.map((row) => [row.featureToggleKey, row]));
    const overrideByKey = new Map((user.featureToggleOverrides ?? []).map((row) => [row.featureToggleKey, row]));

    async function onModeChange(featureToggleKey: FeatureToggleKey, mode: AdminFeatureToggleOverrideMode) {
        setBusyKey(featureToggleKey);
        try {
            if (mode === 'default') {
                const result = await deleteOverride({ userId: user.userId, featureToggleKey });
                if (result.error || !result.data?.admin.featureToggleUserOverrideDelete.success) {
                    toast.error(
                        {
                            de: 'Ausnahme konnte nicht entfernt werden.',
                            en: 'Could not clear the override.',
                        }[locale],
                    );
                    return;
                }
                toast.success({ de: 'Ausnahme entfernt.', en: 'Override cleared.' }[locale]);
            } else {
                const result = await upsertOverride({
                    userId: user.userId,
                    featureToggleKey,
                    enabled: mode === 'user-on',
                });
                if (result.error || !result.data?.admin.featureToggleUserOverrideUpsert.success) {
                    toast.error(
                        {
                            de: 'Ausnahme konnte nicht gespeichert werden.',
                            en: 'Could not save the override.',
                        }[locale],
                    );
                    return;
                }
                toast.success(
                    mode === 'user-on'
                        ? { de: 'Feature für diesen Nutzer aktiviert.', en: 'Feature enabled for this user.' }[locale]
                        : { de: 'Feature für diesen Nutzer deaktiviert.', en: 'Feature disabled for this user.' }[locale],
                );
            }
            await router.invalidate();
        } finally {
            setBusyKey(null);
        }
    }

    return (
        <section className="grid gap-3">
            <div className="grid gap-1">
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Pro Nutzer festlegen. Ohne Ausnahme gilt der globale Standard.',
                            en: 'Override per user. Without an override, the global default applies.',
                        }[locale]
                    }
                </p>
            </div>
            <ul className="grid gap-2">
                {featureToggleKeys.map((featureToggleKey) => {
                    const global = globalByKey.get(featureToggleKey);
                    const override = overrideByKey.get(featureToggleKey);
                    const globalEnabled = global?.enabled === true;
                    const mode = adminFeatureToggleOverrideModeFromEnabled(override?.enabled);
                    const effectiveEnabled = override != null ? override.enabled : globalEnabled;

                    return (
                        <li
                            key={featureToggleKey}
                            className={adminOverviewCardClassName('flex flex-wrap items-center justify-between gap-3 px-4 py-3')}
                        >
                            <div className="grid min-w-0 flex-1 gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium">{adminFeatureToggleLabel(featureToggleKey, locale)}</p>
                                    <StatusBadge tone={effectiveEnabled ? 'success' : 'info'}>
                                        {effectiveEnabled
                                            ? { de: 'Aktiv', en: 'Active' }[locale]
                                            : { de: 'Inaktiv', en: 'Inactive' }[locale]}
                                    </StatusBadge>
                                    {override != null ? (
                                        <StatusBadge tone="info">{{ de: 'Ausnahme', en: 'Override' }[locale]}</StatusBadge>
                                    ) : null}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-mono">{featureToggleKey}</span>
                                    {' · '}
                                    {
                                        {
                                            de: `Global: ${globalEnabled ? 'an' : 'aus'}`,
                                            en: `Global: ${globalEnabled ? 'on' : 'off'}`,
                                        }[locale]
                                    }
                                    {override?.updatedAt ? ` · ${formatDate(new Date(override.updatedAt), { locale, timeZone })}` : null}
                                </p>
                            </div>
                            <Select
                                value={mode}
                                disabled={busyKey === featureToggleKey}
                                onValueChange={(value) => void onModeChange(featureToggleKey, value as AdminFeatureToggleOverrideMode)}
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="min-w-44"
                                    aria-label={adminFeatureToggleLabel(featureToggleKey, locale)}
                                >
                                    <SelectValue placeholder={adminFeatureToggleOverrideModeLabel(mode, locale)} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">{adminFeatureToggleOverrideModeLabel('default', locale)}</SelectItem>
                                    <SelectItem value="user-on">{adminFeatureToggleOverrideModeLabel('user-on', locale)}</SelectItem>
                                    <SelectItem value="user-off">{adminFeatureToggleOverrideModeLabel('user-off', locale)}</SelectItem>
                                </SelectContent>
                            </Select>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
