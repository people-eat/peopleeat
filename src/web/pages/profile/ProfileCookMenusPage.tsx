import { Link, useNavigate } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatDateTime } from '../../../shared';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { CookMenuCard } from '../../components/CookMenuCard';
import { CookMenuCreateDialog } from '../../components/CookMenuCreateDialog';
import type { GqlCProfileCookMenusPageQuery } from '../../graphql/generated';
import { ProfileCookMenusPageUpdatesDocument, ProfileMenuUpsertDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookStubRouteBySlug } from './cookCatalog';

const route = cookStubRouteBySlug('menus');

export const profileCookMenusPageTitle = route.title;
export const profileCookMenusPageDescription = route.description;

const MENU_SCOPES = ['library', 'offers'] as const;
const MENU_STATUS_FILTERS = ['published', 'draft'] as const;
const MENU_SORTS = ['updated-desc', 'updated-asc', 'title-asc'] as const;

type MenuScope = (typeof MENU_SCOPES)[number];
type MenuStatusFilter = 'all' | (typeof MENU_STATUS_FILTERS)[number];
type MenuSort = (typeof MENU_SORTS)[number];

export type ProfileMenusSearch = {
    q?: string;
    scope?: 'offers';
    status?: (typeof MENU_STATUS_FILTERS)[number];
    sort?: Exclude<MenuSort, 'updated-desc'>;
};

export function parseProfileMenusSearch(search: Record<string, unknown>): ProfileMenusSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const scope = search.scope === 'offers' ? 'offers' : undefined;
    const status = scope == null && (search.status === 'published' || search.status === 'draft') ? search.status : undefined;
    const sort = search.sort === 'updated-asc' || search.sort === 'title-asc' ? search.sort : undefined;
    return { q, scope, status, sort };
}

function profileMenusSearchForUrl(next: { q?: string; scope: MenuScope; status: MenuStatusFilter; sort: MenuSort }): ProfileMenusSearch {
    return {
        q: next.q?.trim() || undefined,
        scope: next.scope === 'offers' ? 'offers' : undefined,
        status: next.scope === 'library' && next.status !== 'all' ? next.status : undefined,
        sort: next.sort === 'updated-desc' ? undefined : next.sort,
    };
}

export function ProfileCookMenusPage({ data, search }: { data: GqlCProfileCookMenusPageQuery; search: ProfileMenusSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/profile/menus' });
    const publicationEnabled = useFeatureToggleActive('PUBLICATION_MENUS');
    const aiMenuCreateEnabled = useFeatureToggleActive('AI_MENU_CREATE');
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookMenusPageUpdatesDocument);
    const [, upsertMenu] = useMutation(ProfileMenuUpsertDocument);
    const [creating, setCreating] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    const scope: MenuScope = search.scope === 'offers' ? 'offers' : 'library';
    const statusFilter: MenuStatusFilter = publicationEnabled && scope === 'library' ? (search.status ?? 'all') : 'all';
    const sort: MenuSort = search.sort ?? 'updated-desc';

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({
            search: profileMenusSearchForUrl({ q: nextQ, scope, status: statusFilter, sort }),
            replace: true,
        });
    }, [debouncedQ, navigate, search.q, scope, statusFilter, sort]);

    function updateSearch(next: { q?: string; scope: MenuScope; status: MenuStatusFilter; sort: MenuSort }) {
        void navigate({ search: profileMenusSearchForUrl(next) });
    }

    const libraryMenus = user?.cook?.menus ?? [];
    const offerMenus = user?.cook?.offerMenus ?? [];
    const publishedCount = libraryMenus.filter((menu) => menu.publishedAt != null).length;
    const draftCount = libraryMenus.length - publishedCount;

    const query = (search.q ?? '').trim().toLowerCase();

    function sortMenus<T extends { title: string; updatedAt: string }>(rows: T[]): T[] {
        return rows.slice().sort((a, b) => {
            switch (sort) {
                case 'title-asc':
                    return a.title.localeCompare(b.title, locale);
                case 'updated-asc':
                    return a.updatedAt.localeCompare(b.updatedAt);
                case 'updated-desc':
                default:
                    return b.updatedAt.localeCompare(a.updatedAt);
            }
        });
    }

    const filteredLibraryMenus = sortMenus(
        libraryMenus.filter((menu) => {
            if (statusFilter === 'published' && menu.publishedAt == null) return false;
            if (statusFilter === 'draft' && menu.publishedAt != null) return false;
            if (query.length === 0) return true;
            return menu.title.toLowerCase().includes(query) || menu.description.toLowerCase().includes(query);
        }),
    );

    const filteredOfferMenus = sortMenus(
        offerMenus.filter((menu) => {
            if (query.length === 0) return true;
            const haystack = `${menu.title} ${menu.description}`.toLowerCase();
            const customer = menu.offerContext?.customerFirstName.toLowerCase() ?? '';
            return haystack.includes(query) || customer.includes(query);
        }),
    );

    const sourceCount = scope === 'library' ? libraryMenus.length : offerMenus.length;
    const filteredMenus = scope === 'library' ? filteredLibraryMenus : filteredOfferMenus;

    const scopeTabs: { value: MenuScope; label: string; count: number }[] = [
        { value: 'library', label: t(locale, 'profileCook', 'menus.library'), count: libraryMenus.length },
        { value: 'offers', label: t(locale, 'profileCook', 'menus.inOffers'), count: offerMenus.length },
    ];

    async function onCreate() {
        setCreating(true);
        try {
            const result = await upsertMenu({});
            const menuId = result.data?.user.cook.menuUpsert.referenceId;
            if (!menuId || result.error) throw new Error('create failed');
            toast.success(t(locale, 'profileCook', 'offerMenusEdit.menuCreated'));
            await navigate({ to: '/{-$locale}/profile/menus/$menuId/edit', params: { menuId } });
        } catch {
            toast.error(t(locale, 'profileCook', 'actions.createFailed'));
        } finally {
            setCreating(false);
        }
    }

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            <Tabs
                value={scope}
                onValueChange={(value) =>
                    updateSearch({
                        q: search.q,
                        scope: value as MenuScope,
                        status: value === 'library' ? statusFilter : 'all',
                        sort,
                    })
                }
            >
                <TabsList variant="line" aria-label={t(locale, 'profileCook', 'menus.scope')}>
                    {scopeTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                            <Badge variant="outline" className="bg-muted">
                                {tab.count}
                            </Badge>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {scope === 'offers' ? <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'menus.copiesHint')}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
                <Input
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={t(locale, 'profileCook', 'menus.searchPlaceholder')}
                    aria-label={t(locale, 'profileCook', 'menus.searchAria')}
                    className="min-w-0 flex-1 @md:max-w-xs"
                />
                {publicationEnabled && scope === 'library' ? (
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => updateSearch({ q: search.q, scope, status: value as MenuStatusFilter, sort })}
                    >
                        <SelectTrigger className="w-full @md:w-48" aria-label={t(locale, 'profileCook', 'menus.publication')}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                {t(locale, 'profileCook', 'menus.allCount', { count: libraryMenus.length })}
                            </SelectItem>
                            <SelectItem value="published">
                                {t(locale, 'profileCook', 'menus.publishedCount', { count: publishedCount })}
                            </SelectItem>
                            <SelectItem value="draft">{t(locale, 'profileCook', 'menus.draftCount', { count: draftCount })}</SelectItem>
                        </SelectContent>
                    </Select>
                ) : null}
                <Select
                    value={sort}
                    onValueChange={(value) => updateSearch({ q: search.q, scope, status: statusFilter, sort: value as MenuSort })}
                >
                    <SelectTrigger className="w-full @md:w-48" aria-label={t(locale, 'profileCook', 'actions.sort')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="updated-desc">{t(locale, 'profileCook', 'actions.sortRecent')}</SelectItem>
                        <SelectItem value="updated-asc">{t(locale, 'profileCook', 'actions.sortOldest')}</SelectItem>
                        <SelectItem value="title-asc">{t(locale, 'profileCook', 'actions.sortTitle')}</SelectItem>
                    </SelectContent>
                </Select>
                {scope === 'library' ? (
                    <Button
                        type="button"
                        className="shrink-0"
                        disabled={creating}
                        onClick={() => {
                            if (aiMenuCreateEnabled) {
                                setCreateOpen(true);
                                return;
                            }
                            void onCreate();
                        }}
                    >
                        <PlusIcon className="size-4" />
                        {creating ? t(locale, 'profileCook', 'actions.creating') : t(locale, 'profileCook', 'menus.newMenu')}
                    </Button>
                ) : null}
            </div>

            {sourceCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {t(locale, 'profileCook', scope === 'library' ? 'menus.empty' : 'menus.emptyOffers')}
                </p>
            ) : filteredMenus.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'menus.noneFound')}</p>
            ) : scope === 'library' ? (
                <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
                    {filteredLibraryMenus.map((menu) => (
                        <li key={menu.menuId} className="min-w-0">
                            <CookMenuCard
                                menu={{
                                    title: menu.title,
                                    description: menu.description,
                                    courseCount: menu.courses.length,
                                    courseMealOptionImages: menu.courseMealOptionImages,
                                    publishedAt: menu.publishedAt,
                                    generatedAt: menu.generatedAt,
                                }}
                                to="/{-$locale}/profile/menus/$menuId"
                                params={{ menuId: menu.menuId }}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
                    {filteredOfferMenus.map((menu) => {
                        const offerContext = menu.offerContext;
                        const offerMeta =
                            offerContext != null
                                ? [
                                      offerContext.customerFirstName,
                                      formatDateTime(offerContext.bookingRequestDateTime, {
                                          locale,
                                          timeZone,
                                          dateStyle: 'medium',
                                          timeStyle: 'short',
                                      }),
                                  ]
                                      .filter((part) => part.trim().length > 0)
                                      .join(' · ')
                                : undefined;

                        return (
                            <li key={menu.menuId} className="grid min-w-0 gap-2">
                                <CookMenuCard
                                    menu={{
                                        title: menu.title,
                                        description: menu.description,
                                        courseCount: menu.courses.length,
                                        courseMealOptionImages: menu.courseMealOptionImages,
                                        publishedAt: menu.publishedAt,
                                        generatedAt: menu.generatedAt,
                                    }}
                                    meta={offerMeta}
                                    showStatusBadge={false}
                                    to="/{-$locale}/profile/menus/$menuId"
                                    params={{ menuId: menu.menuId }}
                                />
                                {offerContext != null ? (
                                    <Link
                                        to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                        params={{ bookingRequestOfferId: offerContext.bookingRequestOfferId }}
                                        search={{ tab: 'offer' }}
                                        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                                    >
                                        {t(locale, 'profileCook', 'menu.openOffer')}
                                    </Link>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
            {aiMenuCreateEnabled ? (
                <CookMenuCreateDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    busy={creating}
                    onEmptyCreate={() => {
                        setCreateOpen(false);
                        void onCreate();
                    }}
                    onApplied={(menuId) => {
                        toast.success(t(locale, 'profileCook', 'offerMenusEdit.menuCreated'));
                        void navigate({ to: '/{-$locale}/profile/menus/$menuId', params: { menuId } });
                    }}
                />
            ) : null}
        </main>
    );
}
