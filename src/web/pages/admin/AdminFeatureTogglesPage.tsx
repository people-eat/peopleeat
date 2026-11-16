import { Link, useNavigate } from '@tanstack/react-router';
import { UserPlusIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation, useQuery } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
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
    AdminFeatureToggleUpsertDocument,
    AdminFeatureToggleUserOverrideDeleteDocument,
    AdminFeatureToggleUserOverrideUpsertDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import {
    adminFeatureToggleDescription,
    adminFeatureToggleLabel,
    adminFeatureToggleOverrideModeFromEnabled,
    adminFeatureToggleOverrideModeLabel,
} from './adminFeatureToggles';
import type { AdminFeatureToggleOverrideMode } from './adminFeatureToggles';
import { adminOverviewCardClassName } from './adminOverviewLinkCard';

export function adminFeatureTogglesPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.featureToggles.title');
}
export function adminFeatureTogglesPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.featureToggles.description');
}

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

const ADMIN_FEATURE_TOGGLE_STATUS_VALUES = ['enabled', 'disabled'] as const;
const ADMIN_FEATURE_TOGGLE_CONFIG_VALUES = ['configured', 'not-configured'] as const;
const ADMIN_FEATURE_TOGGLE_OVERRIDE_VALUES = ['with-overrides', 'without-overrides'] as const;
const ADMIN_FEATURE_TOGGLE_SORT_VALUES = ['key-asc', 'updated-desc', 'overrides-desc', 'enabled-first'] as const;

export type AdminFeatureTogglesSearch = {
    q?: string;
    status?: (typeof ADMIN_FEATURE_TOGGLE_STATUS_VALUES)[number];
    config?: (typeof ADMIN_FEATURE_TOGGLE_CONFIG_VALUES)[number];
    overrides?: (typeof ADMIN_FEATURE_TOGGLE_OVERRIDE_VALUES)[number];
    sort?: (typeof ADMIN_FEATURE_TOGGLE_SORT_VALUES)[number];
};

function parseAdminFeatureTogglesSearchValue<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
    return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseAdminFeatureTogglesSearch(search: Record<string, unknown>): AdminFeatureTogglesSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    return {
        q,
        status: parseAdminFeatureTogglesSearchValue(search.status, ADMIN_FEATURE_TOGGLE_STATUS_VALUES),
        config: parseAdminFeatureTogglesSearchValue(search.config, ADMIN_FEATURE_TOGGLE_CONFIG_VALUES),
        overrides: parseAdminFeatureTogglesSearchValue(search.overrides, ADMIN_FEATURE_TOGGLE_OVERRIDE_VALUES),
        sort: parseAdminFeatureTogglesSearchValue(search.sort, ADMIN_FEATURE_TOGGLE_SORT_VALUES),
    };
}

export function adminFeatureTogglesSearchForUrl(search: AdminFeatureTogglesSearch): AdminFeatureTogglesSearch {
    return {
        q: search.q,
        status: search.status,
        config: search.config,
        overrides: search.overrides,
        sort: search.sort,
    };
}

function adminFeatureTogglesHasActiveFilters(search: AdminFeatureTogglesSearch): boolean {
    return search.q != null || search.status != null || search.config != null || search.overrides != null || search.sort != null;
}

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
                    <DialogTitle>{t(locale, 'admin', 'copy.addUserOverride')}</DialogTitle>
                    <DialogDescription>{t(locale, 'admin', 'featureToggles.addOverrideFor', { label })}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <span className="text-sm font-medium">{t(locale, 'admin', 'copy.user')}</span>
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
                                placeholder={t(locale, 'admin', 'copy.searchUsers')}
                                showClear={false}
                                disabled={busy}
                            />
                            <ComboboxContent>
                                <ComboboxEmpty>
                                    {usersFetching ? t(locale, 'admin', 'copy.searching') : t(locale, 'admin', 'copy.noMatches')}
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
                        <span className="text-sm font-medium">{t(locale, 'admin', 'copy.mode')}</span>
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
                        {t(locale, 'admin', 'copy.cancel')}
                    </Button>
                    <Button type="button" disabled={!selectedUser || busy} onClick={() => void onAdd()}>
                        {t(locale, 'admin', 'copy.add')}
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
    const addOverrideLabel = t(locale, 'admin', 'copy.addUserOverride');
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
                            <StatusBadge tone="info">{t(locale, 'admin', 'copy.notConfigured')}</StatusBadge>
                        ) : null}
                        {hasOverrides ? (
                            <StatusBadge tone="info">
                                {t(locale, 'admin', 'featureToggles.overrideCount', {
                                    count: featureToggle.userOverrides.length,
                                })}
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
                                        aria-label={t(locale, 'admin', 'copy.clearOverride')}
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
                                ? t(locale, 'admin', 'featureToggles.enableNamed', { label })
                                : t(locale, 'admin', 'featureToggles.disableNamed', { label })}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="grid gap-3">
                            <span>{adminFeatureToggleDescription(featureToggle.featureToggleKey, locale)}</span>
                            <span>
                                {pendingEnabled
                                    ? t(locale, 'admin', 'copy.setsTheGlobalDefaultToOnPerUserOverridesStillTakePrecedence')
                                    : t(locale, 'admin', 'copy.setsTheGlobalDefaultToOffPerUserOverridesStillTakePrecedence')}
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={toggleBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            variant={pendingEnabled ? 'default' : 'destructive'}
                            disabled={toggleBusy}
                            onClick={(event) => {
                                event.preventDefault();
                                void onConfirmToggle();
                            }}
                        >
                            {toggleBusy
                                ? t(locale, 'admin', 'copy.saving')
                                : pendingEnabled
                                  ? t(locale, 'admin', 'copy.enable')
                                  : t(locale, 'admin', 'copy.disable')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </li>
    );
}

function featureToggleMatchesSearch(featureToggle: FeatureToggleRow, query: string, locale: Locale): boolean {
    if (!query) return true;
    const label = adminFeatureToggleLabel(featureToggle.featureToggleKey, locale).toLowerCase();
    const key = featureToggle.featureToggleKey.toLowerCase();
    return label.includes(query) || key.includes(query);
}

function featureTogglesFilteredSorted({
    featureToggles,
    search,
    locale,
}: {
    featureToggles: FeatureToggleRow[];
    search: AdminFeatureTogglesSearch;
    locale: Locale;
}): FeatureToggleRow[] {
    const searchQuery = (search.q ?? '').toLowerCase();
    const statusFilter: StatusFilter = search.status ?? 'all';
    const configFilter: ConfigFilter = search.config ?? 'all';
    const overrideFilter: OverrideFilter = search.overrides ?? 'all';
    const sort: SortOption = search.sort ?? 'label-asc';
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

export function AdminFeatureTogglesPage({ data, search }: { data: GqlCAdminFeatureTogglesPageQuery; search: AdminFeatureTogglesSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/feature-toggles' });
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [busyKey, setBusyKey] = useState<GqlCFeatureToggleKey | null>(null);
    const [busyUserKey, setBusyUserKey] = useState<string | null>(null);
    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);
    const searchRef = useRef(search);
    searchRef.current = search;
    const [, featureToggleUpsert] = useMutation(AdminFeatureToggleUpsertDocument);
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

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const current = searchRef.current;
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === current.q) return;
        void navigate({
            search: adminFeatureTogglesSearchForUrl({
                ...current,
                q: nextQ,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate]);

    const featureToggles = admin?.featureToggles ?? [];
    const hasActiveFilters = adminFeatureTogglesHasActiveFilters(search) || draftQ.trim().length > 0;
    const visibleFeatureToggles = featureTogglesFilteredSorted({
        featureToggles,
        search,
        locale,
    });

    function updateSearch(next: AdminFeatureTogglesSearch) {
        void navigate({
            search: adminFeatureTogglesSearchForUrl(next),
            replace: true,
        });
    }

    function clearFilters() {
        setDraftQ('');
        updateSearch({});
    }

    async function onToggle(featureToggleKey: GqlCFeatureToggleKey, enabled: boolean) {
        setBusyKey(featureToggleKey);
        try {
            const result = await featureToggleUpsert({ featureToggleKey, enabled });
            if (result.error || !result.data?.admin.featureToggleUpsert.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotUpdateFeatureToggle'));
                return;
            }
            toast.success(enabled ? t(locale, 'admin', 'copy.featureToggleEnabled') : t(locale, 'admin', 'copy.featureToggleDisabled'));
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
                    toast.error(t(locale, 'admin', 'copy.couldNotClearTheOverride'));
                    return;
                }
                toast.success(t(locale, 'admin', 'copy.overrideCleared'));
                return;
            }
            const result = await upsertOverride({ userId, featureToggleKey, enabled: mode === 'user-on' });
            if (result.error || !result.data?.admin.featureToggleUserOverrideUpsert.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotSaveTheOverride'));
                return;
            }
            toast.success(
                mode === 'user-on'
                    ? t(locale, 'admin', 'copy.featureEnabledForThisUser')
                    : t(locale, 'admin', 'copy.featureDisabledForThisUser'),
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
                toast.error(t(locale, 'admin', 'copy.couldNotSaveTheOverride'));
                return;
            }
            toast.success(
                enabled ? t(locale, 'admin', 'copy.featureEnabledForThisUser') : t(locale, 'admin', 'copy.featureDisabledForThisUser'),
            );
        } finally {
            setBusyUserKey(null);
        }
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="@container grid w-full content-start gap-6">
                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="search"
                        value={draftQ}
                        onChange={(event) => setDraftQ(event.target.value)}
                        placeholder={t(locale, 'admin', 'copy.searchNameOrKey')}
                        aria-label={t(locale, 'admin', 'copy.searchFeatureToggles')}
                        className="w-full min-w-0 basis-full @5xl:max-w-sm @5xl:flex-1 @5xl:basis-56"
                    />
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-3 @5xl:w-auto @5xl:flex-1">
                        <Select
                            value={search.status ?? 'all'}
                            onValueChange={(value) =>
                                updateSearch({
                                    ...search,
                                    status: value === 'enabled' || value === 'disabled' ? value : undefined,
                                })
                            }
                        >
                            <SelectTrigger size="sm" className="w-auto shrink-0" aria-label={t(locale, 'admin', 'copy.filterByStatus')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t(locale, 'admin', 'copy.allStatuses')}</SelectItem>
                                <SelectItem value="enabled">{t(locale, 'admin', 'copy.enabled')}</SelectItem>
                                <SelectItem value="disabled">{t(locale, 'admin', 'copy.disabled')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={search.config ?? 'all'}
                            onValueChange={(value) =>
                                updateSearch({
                                    ...search,
                                    config: value === 'configured' || value === 'not-configured' ? value : undefined,
                                })
                            }
                        >
                            <SelectTrigger
                                size="sm"
                                className="w-auto shrink-0"
                                aria-label={t(locale, 'admin', 'copy.filterByConfiguration')}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t(locale, 'admin', 'copy.allConfigurations')}</SelectItem>
                                <SelectItem value="configured">{t(locale, 'admin', 'copy.configured')}</SelectItem>
                                <SelectItem value="not-configured">{t(locale, 'admin', 'copy.notConfigured')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={search.overrides ?? 'all'}
                            onValueChange={(value) =>
                                updateSearch({
                                    ...search,
                                    overrides: value === 'with-overrides' || value === 'without-overrides' ? value : undefined,
                                })
                            }
                        >
                            <SelectTrigger size="sm" className="w-auto shrink-0" aria-label={t(locale, 'admin', 'copy.filterByOverrides')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t(locale, 'admin', 'copy.allOverrides')}</SelectItem>
                                <SelectItem value="with-overrides">{t(locale, 'admin', 'copy.withOverrides')}</SelectItem>
                                <SelectItem value="without-overrides">{t(locale, 'admin', 'copy.withoutOverrides')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={search.sort ?? 'label-asc'}
                            onValueChange={(value) =>
                                updateSearch({
                                    ...search,
                                    sort:
                                        value === 'key-asc' ||
                                        value === 'updated-desc' ||
                                        value === 'overrides-desc' ||
                                        value === 'enabled-first'
                                            ? value
                                            : undefined,
                                })
                            }
                        >
                            <SelectTrigger size="sm" className="w-auto shrink-0" aria-label={t(locale, 'admin', 'copy.sort')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="label-asc">{t(locale, 'admin', 'copy.nameAZ')}</SelectItem>
                                <SelectItem value="key-asc">{t(locale, 'admin', 'copy.keyAZ')}</SelectItem>
                                <SelectItem value="updated-desc">{t(locale, 'admin', 'copy.recentlyUpdated')}</SelectItem>
                                <SelectItem value="overrides-desc">{t(locale, 'admin', 'copy.mostOverrides')}</SelectItem>
                                <SelectItem value="enabled-first">{t(locale, 'admin', 'copy.enabledFirst')}</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters ? (
                            <Button
                                type="button"
                                variant="link"
                                className="h-auto shrink-0 p-0 text-sm text-muted-foreground"
                                onClick={clearFilters}
                            >
                                {t(locale, 'admin', 'copy.clearFilters')}
                            </Button>
                        ) : null}

                        <p className="text-sm text-muted-foreground tabular-nums xl:ml-auto">
                            {t(locale, 'admin', 'featureToggles.visibleOfTotal', {
                                visible: visibleFeatureToggles.length,
                                total: featureToggles.length,
                            })}
                        </p>
                    </div>
                </div>

                {featureToggles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noFeatureTogglesYet')}</p>
                ) : visibleFeatureToggles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noMatches')}</p>
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
