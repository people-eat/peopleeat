import { Link } from '@tanstack/react-router';
import { ToggleRightIcon, UserPlusIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation, useQuery } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate, userDisplayName } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/base/alert-dialog';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/base/dialog';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { StatusBadge } from '../../components/base/status-badge';
import { Switch } from '../../components/base/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
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
    adminFeatureToggleDescription,
    adminFeatureToggleLabel,
    adminFeatureToggleOverrideModeFromEnabled,
    adminFeatureToggleOverrideModeLabel,
} from './adminFeatureToggles';
import type { AdminFeatureToggleOverrideMode } from './adminFeatureToggles';
import { adminOverviewCardClassName } from './adminOverviewLinkCard';

export const adminFeatureTogglesPageTitle = { de: 'Feature Toggles', en: 'Feature Toggles' } as const;
export const adminFeatureTogglesPageDescription = {
    de: 'Globale Feature Toggles und Nutzer-Ausnahmen. Fehlende Einträge gelten als aus.',
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

type StatusFilter = 'all' | 'enabled' | 'disabled';
type ConfigFilter = 'all' | 'configured' | 'not-configured';
type OverrideFilter = 'all' | 'with-overrides' | 'without-overrides';
type SortOption = 'label-asc' | 'key-asc' | 'updated-desc' | 'overrides-desc' | 'enabled-first';

function userOptionLabel(user: UserOption): string {
    return user.emailAddress ? `${userDisplayName(user)} · ${user.emailAddress}` : userDisplayName(user);
}

function FeatureToggleAddOverrideDialog({
    open,
    onOpenChange,
    featureToggle,
    busy,
    onAddOverride,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    featureToggle: FeatureToggleRow;
    busy: boolean;
    onAddOverride: (userId: string, enabled: boolean) => Promise<void>;
}) {
    const locale = useLocale();
    const [searchText, setSearchText] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
    const [addMode, setAddMode] = useState<'user-on' | 'user-off'>('user-on');
    const debouncedSearch = useDebouncedValue(searchText, 300);
    const existingUserIds = new Set(featureToggle.userOverrides.map((row) => row.userId));
    const label = adminFeatureToggleLabel(featureToggle.featureToggleKey, locale);

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
        pause: !open || debouncedSearch.trim().length < 2 || (selectedUser != null && searchText === userOptionLabel(selectedUser)),
    });
    const users = (usersData?.currentSession.user?.admin?.users ?? []).filter((user) => !existingUserIds.has(user.userId));

    useEffect(() => {
        if (open) return;
        setSearchText('');
        setSelectedUser(null);
        setAddMode('user-on');
    }, [open]);

    async function onAdd() {
        if (!selectedUser || busy) return;
        await onAddOverride(selectedUser.userId, addMode === 'user-on');
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ de: 'Nutzer-Ausnahme hinzufügen', en: 'Add user override' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: `Ausnahme für „${label}“ festlegen.`,
                                en: `Set an override for “${label}”.`,
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <span className="text-sm font-medium">{{ de: 'Nutzer', en: 'User' }[locale]}</span>
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
                                disabled={busy}
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
                    <div className="grid gap-2">
                        <span className="text-sm font-medium">{{ de: 'Modus', en: 'Mode' }[locale]}</span>
                        <Select value={addMode} disabled={busy} onValueChange={(value) => setAddMode(value as 'user-on' | 'user-off')}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user-on">{adminFeatureToggleOverrideModeLabel('user-on', locale)}</SelectItem>
                                <SelectItem value="user-off">{adminFeatureToggleOverrideModeLabel('user-off', locale)}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button type="button" disabled={!selectedUser || busy} onClick={() => void onAdd()}>
                        {{ de: 'Hinzufügen', en: 'Add' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function FeatureToggleCard({
    featureToggle,
    busyKey,
    busyUserKey,
    onToggle,
    onOverrideModeChange,
    onAddOverride,
}: {
    featureToggle: FeatureToggleRow;
    busyKey: GqlCFeatureToggleKey | null;
    busyUserKey: string | null;
    onToggle: (enabled: boolean) => Promise<void>;
    onOverrideModeChange: (userId: string, mode: AdminFeatureToggleOverrideMode) => Promise<void>;
    onAddOverride: (userId: string, enabled: boolean) => Promise<void>;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
    const label = adminFeatureToggleLabel(featureToggle.featureToggleKey, locale);
    const addOverrideLabel = { de: 'Nutzer-Ausnahme hinzufügen', en: 'Add user override' }[locale];
    const toggleBusy = busyKey === featureToggle.featureToggleKey;
    const addBusy = busyUserKey?.startsWith(`${featureToggle.featureToggleKey}:`) === true;
    const hasOverrides = featureToggle.userOverrides.length > 0;

    async function onConfirmToggle() {
        if (pendingEnabled == null || toggleBusy) return;
        await onToggle(pendingEnabled);
        setPendingEnabled(null);
    }

    return (
        <li className={adminOverviewCardClassName('grid gap-3 px-4 py-3')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid min-w-0 flex-1 gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{label}</p>
                        {!featureToggle.persisted ? (
                            <StatusBadge tone="info">{{ de: 'Nicht konfiguriert', en: 'Not configured' }[locale]}</StatusBadge>
                        ) : null}
                        {hasOverrides ? (
                            <StatusBadge tone="info">
                                {
                                    {
                                        de: `${featureToggle.userOverrides.length} Ausnahme${featureToggle.userOverrides.length === 1 ? '' : 'n'}`,
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
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                aria-label={addOverrideLabel}
                                onClick={() => setDialogOpen(true)}
                            >
                                <UserPlusIcon aria-hidden />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{addOverrideLabel}</TooltipContent>
                    </Tooltip>
                    <Switch
                        checked={featureToggle.enabled}
                        disabled={toggleBusy}
                        onCheckedChange={(next) => setPendingEnabled(next)}
                        aria-label={label}
                    />
                </div>
            </div>

            {hasOverrides ? (
                <ul className="grid gap-2 border-t border-border/60 pt-3">
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
                                            <SelectItem value="user-on">
                                                {adminFeatureToggleOverrideModeLabel('user-on', locale)}
                                            </SelectItem>
                                            <SelectItem value="user-off">
                                                {adminFeatureToggleOverrideModeLabel('user-off', locale)}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={busy}
                                        aria-label={{ de: 'Ausnahme entfernen', en: 'Clear override' }[locale]}
                                        onClick={() => void onOverrideModeChange(override.userId, 'default')}
                                    >
                                        <XIcon aria-hidden />
                                    </Button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : null}

            <FeatureToggleAddOverrideDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                featureToggle={featureToggle}
                busy={addBusy}
                onAddOverride={onAddOverride}
            />

            <AlertDialog
                open={pendingEnabled != null}
                onOpenChange={(open) => {
                    if (!open && !toggleBusy) setPendingEnabled(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingEnabled
                                ? {
                                      de: `„${label}“ aktivieren?`,
                                      en: `Enable “${label}”?`,
                                  }[locale]
                                : {
                                      de: `„${label}“ deaktivieren?`,
                                      en: `Disable “${label}”?`,
                                  }[locale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="grid gap-3">
                            <span>{adminFeatureToggleDescription(featureToggle.featureToggleKey, locale)}</span>
                            <span>
                                {pendingEnabled
                                    ? {
                                          de: 'Der globale Standard wird auf an gesetzt. Nutzer-Ausnahmen haben weiter Vorrang.',
                                          en: 'Sets the global default to on. Per-user overrides still take precedence.',
                                      }[locale]
                                    : {
                                          de: 'Der globale Standard wird auf aus gesetzt. Nutzer-Ausnahmen haben weiter Vorrang.',
                                          en: 'Sets the global default to off. Per-user overrides still take precedence.',
                                      }[locale]}
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={toggleBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            variant={pendingEnabled ? 'default' : 'destructive'}
                            disabled={toggleBusy}
                            onClick={(event) => {
                                event.preventDefault();
                                void onConfirmToggle();
                            }}
                        >
                            {toggleBusy
                                ? { de: 'Wird gespeichert…', en: 'Saving…' }[locale]
                                : pendingEnabled
                                  ? { de: 'Aktivieren', en: 'Enable' }[locale]
                                  : { de: 'Deaktivieren', en: 'Disable' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </li>
    );
}

function featureToggleMatchesSearch(featureToggle: FeatureToggleRow, query: string, locale: 'de' | 'en'): boolean {
    if (!query) return true;
    const label = adminFeatureToggleLabel(featureToggle.featureToggleKey, locale).toLowerCase();
    const key = featureToggle.featureToggleKey.toLowerCase();
    return label.includes(query) || key.includes(query);
}

function featureTogglesFilteredSorted({
    featureToggles,
    searchQuery,
    statusFilter,
    configFilter,
    overrideFilter,
    sort,
    locale,
}: {
    featureToggles: FeatureToggleRow[];
    searchQuery: string;
    statusFilter: StatusFilter;
    configFilter: ConfigFilter;
    overrideFilter: OverrideFilter;
    sort: SortOption;
    locale: 'de' | 'en';
}): FeatureToggleRow[] {
    const filtered = featureToggles.filter((featureToggle) => {
        if (!featureToggleMatchesSearch(featureToggle, searchQuery, locale)) return false;
        if (statusFilter === 'enabled' && !featureToggle.enabled) return false;
        if (statusFilter === 'disabled' && featureToggle.enabled) return false;
        if (configFilter === 'configured' && !featureToggle.persisted) return false;
        if (configFilter === 'not-configured' && featureToggle.persisted) return false;
        if (overrideFilter === 'with-overrides' && featureToggle.userOverrides.length === 0) return false;
        if (overrideFilter === 'without-overrides' && featureToggle.userOverrides.length > 0) return false;
        return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
        switch (sort) {
            case 'key-asc':
                return a.featureToggleKey.localeCompare(b.featureToggleKey);
            case 'updated-desc': {
                const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                if (bTime !== aTime) return bTime - aTime;
                return adminFeatureToggleLabel(a.featureToggleKey, locale).localeCompare(
                    adminFeatureToggleLabel(b.featureToggleKey, locale),
                );
            }
            case 'overrides-desc': {
                if (b.userOverrides.length !== a.userOverrides.length) {
                    return b.userOverrides.length - a.userOverrides.length;
                }
                return adminFeatureToggleLabel(a.featureToggleKey, locale).localeCompare(
                    adminFeatureToggleLabel(b.featureToggleKey, locale),
                );
            }
            case 'enabled-first': {
                if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
                return adminFeatureToggleLabel(a.featureToggleKey, locale).localeCompare(
                    adminFeatureToggleLabel(b.featureToggleKey, locale),
                );
            }
            case 'label-asc':
            default:
                return adminFeatureToggleLabel(a.featureToggleKey, locale).localeCompare(
                    adminFeatureToggleLabel(b.featureToggleKey, locale),
                );
        }
    });
    return sorted;
}

export function AdminFeatureTogglesPage({ data }: { data: GqlCAdminFeatureTogglesPageQuery }) {
    const locale = useLocale();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [busyKey, setBusyKey] = useState<GqlCFeatureToggleKey | null>(null);
    const [busyUserKey, setBusyUserKey] = useState<string | null>(null);
    const [draftSearch, setDraftSearch] = useState('');
    const debouncedSearch = useDebouncedValue(draftSearch, 200);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [configFilter, setConfigFilter] = useState<ConfigFilter>('all');
    const [overrideFilter, setOverrideFilter] = useState<OverrideFilter>('all');
    const [sort, setSort] = useState<SortOption>('label-asc');
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
    const searchQuery = debouncedSearch.trim().toLowerCase();
    const hasActiveFilters =
        draftSearch.trim().length > 0 ||
        statusFilter !== 'all' ||
        configFilter !== 'all' ||
        overrideFilter !== 'all' ||
        sort !== 'label-asc';
    const visibleFeatureToggles = featureTogglesFilteredSorted({
        featureToggles,
        searchQuery,
        statusFilter,
        configFilter,
        overrideFilter,
        sort,
        locale,
    });

    function clearFilters() {
        setDraftSearch('');
        setStatusFilter('all');
        setConfigFilter('all');
        setOverrideFilter('all');
        setSort('label-asc');
    }

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
                    toast.error({ de: 'Ausnahme konnte nicht entfernt werden.', en: 'Could not clear the override.' }[locale]);
                    return;
                }
                toast.success({ de: 'Ausnahme entfernt.', en: 'Override cleared.' }[locale]);
                return;
            }
            const result = await upsertOverride({ userId, featureToggleKey, enabled: mode === 'user-on' });
            if (result.error || !result.data?.admin.featureToggleUserOverrideUpsert.success) {
                toast.error({ de: 'Ausnahme konnte nicht gespeichert werden.', en: 'Could not save the override.' }[locale]);
                return;
            }
            toast.success(
                mode === 'user-on'
                    ? { de: 'Feature für diesen Nutzer aktiviert.', en: 'Feature enabled for this user.' }[locale]
                    : { de: 'Feature für diesen Nutzer deaktiviert.', en: 'Feature disabled for this user.' }[locale],
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
                toast.error({ de: 'Ausnahme konnte nicht gespeichert werden.', en: 'Could not save the override.' }[locale]);
                return;
            }
            toast.success(
                enabled
                    ? { de: 'Feature für diesen Nutzer aktiviert.', en: 'Feature enabled for this user.' }[locale]
                    : { de: 'Feature für diesen Nutzer deaktiviert.', en: 'Feature disabled for this user.' }[locale],
            );
        } finally {
            setBusyUserKey(null);
        }
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                    <ToggleRightIcon className="size-8 text-muted-foreground" aria-hidden />
                    {adminFeatureTogglesPageTitle[locale]}
                </h1>

                <div className="grid gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            type="search"
                            value={draftSearch}
                            onChange={(event) => setDraftSearch(event.target.value)}
                            placeholder={{ de: 'Name oder Key suchen…', en: 'Search name or key…' }[locale]}
                            aria-label={{ de: 'Feature Toggles suchen', en: 'Search feature toggles' }[locale]}
                            className="max-w-sm"
                        />
                        <p className="text-sm text-muted-foreground tabular-nums">
                            {
                                {
                                    de: `${visibleFeatureToggles.length} von ${featureToggles.length}`,
                                    en: `${visibleFeatureToggles.length} of ${featureToggles.length}`,
                                }[locale]
                            }
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? 'all')}>
                            <SelectTrigger size="sm" aria-label={{ de: 'Status filtern', en: 'Filter by status' }[locale]}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{{ de: 'Alle Status', en: 'All statuses' }[locale]}</SelectItem>
                                <SelectItem value="enabled">{{ de: 'Aktiv', en: 'Enabled' }[locale]}</SelectItem>
                                <SelectItem value="disabled">{{ de: 'Inaktiv', en: 'Disabled' }[locale]}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={configFilter} onValueChange={(value) => setConfigFilter((value as ConfigFilter) ?? 'all')}>
                            <SelectTrigger size="sm" aria-label={{ de: 'Konfiguration filtern', en: 'Filter by configuration' }[locale]}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{{ de: 'Alle Konfigurationen', en: 'All configurations' }[locale]}</SelectItem>
                                <SelectItem value="configured">{{ de: 'Konfiguriert', en: 'Configured' }[locale]}</SelectItem>
                                <SelectItem value="not-configured">{{ de: 'Nicht konfiguriert', en: 'Not configured' }[locale]}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={overrideFilter} onValueChange={(value) => setOverrideFilter((value as OverrideFilter) ?? 'all')}>
                            <SelectTrigger size="sm" aria-label={{ de: 'Ausnahmen filtern', en: 'Filter by overrides' }[locale]}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{{ de: 'Alle Ausnahmen', en: 'All overrides' }[locale]}</SelectItem>
                                <SelectItem value="with-overrides">{{ de: 'Mit Ausnahmen', en: 'With overrides' }[locale]}</SelectItem>
                                <SelectItem value="without-overrides">
                                    {{ de: 'Ohne Ausnahmen', en: 'Without overrides' }[locale]}
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sort} onValueChange={(value) => setSort((value as SortOption) ?? 'label-asc')}>
                            <SelectTrigger size="sm" aria-label={{ de: 'Sortierung', en: 'Sort' }[locale]}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="label-asc">{{ de: 'Name A–Z', en: 'Name A–Z' }[locale]}</SelectItem>
                                <SelectItem value="key-asc">{{ de: 'Key A–Z', en: 'Key A–Z' }[locale]}</SelectItem>
                                <SelectItem value="updated-desc">
                                    {{ de: 'Zuletzt aktualisiert', en: 'Recently updated' }[locale]}
                                </SelectItem>
                                <SelectItem value="overrides-desc">{{ de: 'Meiste Ausnahmen', en: 'Most overrides' }[locale]}</SelectItem>
                                <SelectItem value="enabled-first">{{ de: 'Aktive zuerst', en: 'Enabled first' }[locale]}</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters ? (
                            <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-sm text-muted-foreground"
                                onClick={clearFilters}
                            >
                                {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                            </Button>
                        ) : null}
                    </div>
                </div>

                {featureToggles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Noch keine Feature Toggles.', en: 'No feature toggles yet.' }[locale]}
                    </p>
                ) : visibleFeatureToggles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}</p>
                ) : (
                    <ul className="grid gap-3">
                        {visibleFeatureToggles.map((featureToggle) => (
                            <FeatureToggleCard
                                key={featureToggle.featureToggleKey}
                                featureToggle={featureToggle}
                                busyKey={busyKey}
                                busyUserKey={busyUserKey}
                                onToggle={(enabled) => onToggle(featureToggle.featureToggleKey, enabled)}
                                onOverrideModeChange={(userId, mode) => onOverrideModeChange(featureToggle.featureToggleKey, userId, mode)}
                                onAddOverride={(userId, enabled) => onAddOverride(featureToggle.featureToggleKey, userId, enabled)}
                            />
                        ))}
                    </ul>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
