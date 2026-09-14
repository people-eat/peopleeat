import { Link } from '@tanstack/react-router';
import { ToggleRightIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation, useQuery } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate, userDisplayName } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { StatusBadge } from '../../components/base/status-badge';
import { Switch } from '../../components/base/switch';
import type { GqlCAdminFeatureTogglesPageQuery, GqlCFeatureToggleKey } from '../../graphql/generated';
import {
    AdminFeatureTogglesPageUpdatesDocument,
    AdminFeatureTogglesUserSearchDocument,
    AdminFeatureToggleUpdateDocument,
    AdminFeatureToggleUserOverrideDeleteDocument,
    AdminFeatureToggleUserOverrideUpsertDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import {
    adminFeatureToggleLabel,
    adminFeatureToggleOverrideModeFromEnabled,
    adminFeatureToggleOverrideModeLabel,
} from './adminFeatureToggles';
import type { AdminFeatureToggleOverrideMode } from './adminFeatureToggles';
import { adminOverviewCardClassName } from './adminOverviewLinkCard';

export const adminFeatureTogglesPageTitle = { de: 'Feature Toggles', en: 'Feature Toggles' } as const;
export const adminFeatureTogglesPageDescription = {
    de: 'Globale Feature Toggles und Nutzer-Overrides. Fehlende Einträge gelten als aus.',
    en: 'Global feature toggles and per-user overrides. Missing entries count as off.',
} as const;

type FeatureToggleRow = NonNullable<
    NonNullable<NonNullable<GqlCAdminFeatureTogglesPageQuery['currentSession']['user']>['admin']>['featureToggles']
>[number];

type UserOption = {
    userId: string;
    firstName: string;
    lastName: string;
    emailAddress: string | null;
};

function userOptionLabel(user: UserOption): string {
    return user.emailAddress ? `${userDisplayName(user)} · ${user.emailAddress}` : userDisplayName(user);
}

function FeatureToggleUserOverrides({
    featureToggle,
    busyUserKey,
    onOverrideModeChange,
    onAddOverride,
}: {
    featureToggle: FeatureToggleRow;
    busyUserKey: string | null;
    onOverrideModeChange: (userId: string, mode: AdminFeatureToggleOverrideMode) => Promise<void>;
    onAddOverride: (userId: string, enabled: boolean) => Promise<void>;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const [searchText, setSearchText] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
    const [addMode, setAddMode] = useState<'force-on' | 'force-off'>('force-on');
    const [addBusy, setAddBusy] = useState(false);
    const debouncedSearch = useDebouncedValue(searchText, 300);
    const existingUserIds = new Set(featureToggle.userOverrides.map((row) => row.userId));

    const [{ data: usersData, fetching: usersFetching }] = useQuery({
        query: AdminFeatureTogglesUserSearchDocument,
        variables: {
            criterion: {
                skip: 0,
                take: 20,
                searchText: debouncedSearch.trim() || undefined,
                types: ['customer', 'cook', 'admin'],
            },
        },
        pause: debouncedSearch.trim().length < 2 || (selectedUser != null && searchText === userOptionLabel(selectedUser)),
    });
    const users = (usersData?.currentSession.user?.admin?.users ?? []).filter((user) => !existingUserIds.has(user.userId));

    async function onAdd() {
        if (!selectedUser || addBusy) return;
        setAddBusy(true);
        try {
            await onAddOverride(selectedUser.userId, addMode === 'force-on');
            setSelectedUser(null);
            setSearchText('');
            setAddMode('force-on');
        } finally {
            setAddBusy(false);
        }
    }

    return (
        <div className="grid gap-3 border-t border-border/60 pt-3">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Nutzer-Overrides', en: 'User overrides' }[locale]}
                </p>
                <StatusBadge tone="info">
                    {
                        {
                            de: `${featureToggle.userOverrides.length} Override${featureToggle.userOverrides.length === 1 ? '' : 's'}`,
                            en: `${featureToggle.userOverrides.length} override${featureToggle.userOverrides.length === 1 ? '' : 's'}`,
                        }[locale]
                    }
                </StatusBadge>
            </div>

            {featureToggle.userOverrides.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {{ de: 'Noch keine Nutzer-Overrides.', en: 'No user overrides yet.' }[locale]}
                </p>
            ) : (
                <ul className="grid gap-2">
                    {featureToggle.userOverrides.map((override) => {
                        const mode = adminFeatureToggleOverrideModeFromEnabled(override.enabled);
                        const busy = busyUserKey === `${featureToggle.featureToggleKey}:${override.userId}`;
                        return (
                            <li
                                key={override.userId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2"
                            >
                                <div className="grid min-w-0 flex-1 gap-0.5">
                                    <Link
                                        to="/{-$locale}/admin/users/$userId"
                                        params={{ userId: override.userId }}
                                        search={{ tab: 'feature-toggles' }}
                                        className="truncate font-medium text-foreground underline-offset-4 hover:underline"
                                    >
                                        {userDisplayName(override.user)}
                                    </Link>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {override.user.emailAddress ?? override.userId}
                                        {override.updatedAt ? ` · ${formatDate(new Date(override.updatedAt), { locale, timeZone })}` : null}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={mode}
                                        disabled={busy}
                                        onValueChange={(value) =>
                                            void onOverrideModeChange(override.userId, value as AdminFeatureToggleOverrideMode)
                                        }
                                    >
                                        <SelectTrigger size="sm" className="min-w-40">
                                            <SelectValue placeholder={adminFeatureToggleOverrideModeLabel(mode, locale)} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">
                                                {adminFeatureToggleOverrideModeLabel('default', locale)}
                                            </SelectItem>
                                            <SelectItem value="force-on">
                                                {adminFeatureToggleOverrideModeLabel('force-on', locale)}
                                            </SelectItem>
                                            <SelectItem value="force-off">
                                                {adminFeatureToggleOverrideModeLabel('force-off', locale)}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={busy}
                                        aria-label={{ de: 'Override entfernen', en: 'Clear override' }[locale]}
                                        onClick={() => void onOverrideModeChange(override.userId, 'default')}
                                    >
                                        <XIcon aria-hidden />
                                    </Button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-56 flex-1">
                    <Combobox
                        items={users.map((entry) => entry.userId)}
                        value={selectedUser?.userId ?? null}
                        inputValue={searchText}
                        onValueChange={(userId: string | null) => {
                            if (!userId) {
                                setSelectedUser(null);
                                return;
                            }
                            const match = users.find((entry) => entry.userId === userId);
                            if (!match) return;
                            setSelectedUser(match);
                            setSearchText(userOptionLabel(match));
                        }}
                        onInputValueChange={(next) => {
                            setSearchText(next);
                            if (selectedUser && next !== userOptionLabel(selectedUser)) {
                                setSelectedUser(null);
                            }
                        }}
                        itemToStringLabel={(userId: string) => {
                            const match = users.find((entry) => entry.userId === userId);
                            return match ? userOptionLabel(match) : userId;
                        }}
                    >
                        <ComboboxInput
                            className="w-full"
                            placeholder={{ de: 'Nutzer suchen…', en: 'Search users…' }[locale]}
                            showClear={false}
                            disabled={addBusy}
                        />
                        <ComboboxContent>
                            <ComboboxEmpty>
                                {usersFetching
                                    ? { de: 'Suche…', en: 'Searching…' }[locale]
                                    : { de: 'Keine Treffer.', en: 'No matches.' }[locale]}
                            </ComboboxEmpty>
                            <ComboboxList>
                                {(userId: string) => {
                                    const match = users.find((entry) => entry.userId === userId);
                                    if (!match) return null;
                                    return (
                                        <ComboboxItem key={userId} value={userId}>
                                            {userOptionLabel(match)}
                                        </ComboboxItem>
                                    );
                                }}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </div>
                <Select value={addMode} disabled={addBusy} onValueChange={(value) => setAddMode(value as 'force-on' | 'force-off')}>
                    <SelectTrigger size="sm" className="min-w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="force-on">{adminFeatureToggleOverrideModeLabel('force-on', locale)}</SelectItem>
                        <SelectItem value="force-off">{adminFeatureToggleOverrideModeLabel('force-off', locale)}</SelectItem>
                    </SelectContent>
                </Select>
                <Button type="button" size="sm" disabled={!selectedUser || addBusy} onClick={() => void onAdd()}>
                    {{ de: 'Hinzufügen', en: 'Add' }[locale]}
                </Button>
            </div>
        </div>
    );
}

export function AdminFeatureTogglesPage({ data }: { data: GqlCAdminFeatureTogglesPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [busyKey, setBusyKey] = useState<GqlCFeatureToggleKey | null>(null);
    const [busyUserKey, setBusyUserKey] = useState<string | null>(null);
    const [, featureToggleUpdate] = useMutation(AdminFeatureToggleUpdateDocument);
    const [, upsertOverride] = useMutation(AdminFeatureToggleUserOverrideUpsertDocument);
    const [, deleteOverride] = useMutation(AdminFeatureToggleUserOverrideDeleteDocument);

    useEffect(() => {
        if (!seed) return;
        const request = createRequest(AdminFeatureTogglesPageUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seed]);

    const featureToggles = admin?.featureToggles ?? [];

    async function onToggle(featureToggleKey: GqlCFeatureToggleKey, enabled: boolean) {
        setBusyKey(featureToggleKey);
        try {
            const result = await featureToggleUpdate({ featureToggleKey, enabled });
            if (result.error || !result.data?.admin.featureToggleUpdate.success) {
                toast.error({ de: 'Feature Toggle konnte nicht geändert werden.', en: 'Could not update feature toggle.' }[locale]);
                return;
            }
            toast.success(
                enabled
                    ? { de: 'Feature Toggle aktiviert.', en: 'Feature toggle enabled.' }[locale]
                    : { de: 'Feature Toggle deaktiviert.', en: 'Feature toggle disabled.' }[locale],
            );
        } finally {
            setBusyKey(null);
        }
    }

    async function onOverrideModeChange(featureToggleKey: GqlCFeatureToggleKey, userId: string, mode: AdminFeatureToggleOverrideMode) {
        setBusyUserKey(`${featureToggleKey}:${userId}`);
        try {
            if (mode === 'default') {
                const result = await deleteOverride({ userId, featureToggleKey });
                if (result.error || !result.data?.admin.featureToggleUserOverrideDelete.success) {
                    toast.error({ de: 'Override konnte nicht entfernt werden.', en: 'Could not clear the override.' }[locale]);
                    return;
                }
                toast.success({ de: 'Override entfernt.', en: 'Override cleared.' }[locale]);
                return;
            }
            const result = await upsertOverride({ userId, featureToggleKey, enabled: mode === 'force-on' });
            if (result.error || !result.data?.admin.featureToggleUserOverrideUpsert.success) {
                toast.error({ de: 'Override konnte nicht gespeichert werden.', en: 'Could not save the override.' }[locale]);
                return;
            }
            toast.success(
                mode === 'force-on'
                    ? { de: 'Feature für diesen Nutzer erzwungen: an.', en: 'Feature forced on for this user.' }[locale]
                    : { de: 'Feature für diesen Nutzer erzwungen: aus.', en: 'Feature forced off for this user.' }[locale],
            );
        } finally {
            setBusyUserKey(null);
        }
    }

    async function onAddOverride(featureToggleKey: GqlCFeatureToggleKey, userId: string, enabled: boolean) {
        setBusyUserKey(`${featureToggleKey}:${userId}`);
        try {
            const result = await upsertOverride({ userId, featureToggleKey, enabled });
            if (result.error || !result.data?.admin.featureToggleUserOverrideUpsert.success) {
                toast.error({ de: 'Override konnte nicht gespeichert werden.', en: 'Could not save the override.' }[locale]);
                return;
            }
            toast.success(
                enabled
                    ? { de: 'Feature für diesen Nutzer erzwungen: an.', en: 'Feature forced on for this user.' }[locale]
                    : { de: 'Feature für diesen Nutzer erzwungen: aus.', en: 'Feature forced off for this user.' }[locale],
            );
        } finally {
            setBusyUserKey(null);
        }
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <ToggleRightIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminFeatureTogglesPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminFeatureTogglesPageDescription[locale]}</p>
                </div>
                {featureToggles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Noch keine Feature Toggles.', en: 'No feature toggles yet.' }[locale]}
                    </p>
                ) : (
                    <ul className="grid gap-3">
                        {featureToggles.map((featureToggle) => (
                            <li key={featureToggle.featureToggleKey} className={adminOverviewCardClassName('grid gap-3 px-4 py-3')}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="grid min-w-0 flex-1 gap-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium">{adminFeatureToggleLabel(featureToggle.featureToggleKey, locale)}</p>
                                            {!featureToggle.persisted ? (
                                                <StatusBadge tone="info">
                                                    {{ de: 'Nicht konfiguriert', en: 'Not configured' }[locale]}
                                                </StatusBadge>
                                            ) : null}
                                            {featureToggle.userOverrides.length > 0 ? (
                                                <StatusBadge tone="info">
                                                    {
                                                        {
                                                            de: `${featureToggle.userOverrides.length} Override${featureToggle.userOverrides.length === 1 ? '' : 's'}`,
                                                            en: `${featureToggle.userOverrides.length} override${featureToggle.userOverrides.length === 1 ? '' : 's'}`,
                                                        }[locale]
                                                    }
                                                </StatusBadge>
                                            ) : null}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-mono">{featureToggle.featureToggleKey}</span>
                                            {featureToggle.persisted && featureToggle.updatedAt
                                                ? ` · ${formatDate(new Date(featureToggle.updatedAt), { locale, timeZone })}`
                                                : null}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={featureToggle.enabled}
                                        disabled={busyKey === featureToggle.featureToggleKey}
                                        onCheckedChange={(next) => void onToggle(featureToggle.featureToggleKey, next)}
                                        aria-label={adminFeatureToggleLabel(featureToggle.featureToggleKey, locale)}
                                    />
                                </div>
                                <FeatureToggleUserOverrides
                                    featureToggle={featureToggle}
                                    busyUserKey={busyUserKey}
                                    onOverrideModeChange={(userId, mode) =>
                                        onOverrideModeChange(featureToggle.featureToggleKey, userId, mode)
                                    }
                                    onAddOverride={(userId, enabled) => onAddOverride(featureToggle.featureToggleKey, userId, enabled)}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
