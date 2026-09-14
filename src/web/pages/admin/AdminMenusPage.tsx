import { Link, useNavigate } from '@tanstack/react-router';

import { formatDate } from '../../../shared';
import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { CookMenuCard } from '../../components/CookMenuCard';
import type { GqlCAdminMenusPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import {
    adminCookInventoryListCriterion,
    adminCookInventoryListSearchForUrl,
    parseAdminCookInventoryListSearch,
} from './adminCookInventoryListSearch';
import type { AdminCookInventoryListSearch } from './adminCookInventoryListSearch';
import { AdminCookInventoryListToolbar } from './AdminCookInventoryListToolbar';
import { adminListPageCount, adminListPageSize } from './adminListPaginationSearch';

export const adminMenusPageTitle = { de: 'Menüs', en: 'Menus' } as const;
export const adminMenusPageDescription = {
    de: 'Menüs aller Köche einsehen (inkl. gelöschter).',
    en: 'Inspect menus from all cooks (including deleted).',
} as const;

export type AdminMenusSearch = Omit<AdminCookInventoryListSearch, 'image'>;

export function parseAdminMenusSearch(search: Record<string, unknown>): AdminMenusSearch {
    const parsed = parseAdminCookInventoryListSearch(search);
    const { image: _image, ...rest } = parsed;
    return rest;
}

function adminMenusSearchForUrl(search: AdminMenusSearch) {
    const { image: _image, ...rest } = adminCookInventoryListSearchForUrl(search);
    return rest;
}

export function adminMenusPageVariables(search: AdminMenusSearch) {
    return {
        criterion: adminCookInventoryListCriterion(search),
    };
}

export function AdminMenusPage({ data, search }: { data: GqlCAdminMenusPageQuery; search: AdminMenusSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/menus' });
    const admin = data.currentSession.user?.admin;
    const menus = admin?.cookMenus ?? [];
    const total = admin?.cookMenusCounts[0] ?? 0;
    const page = search.page ?? 1;
    const pageSize = adminListPageSize(search);
    const pageCount = adminListPageCount(total, pageSize);

    function updateSearch(next: AdminMenusSearch) {
        void navigate({
            search: adminMenusSearchForUrl(next),
            replace: true,
        });
    }

    return (
        <AdminPathPageChrome contentClassName="min-h-0 overflow-hidden gap-0">
            <AdminPinnedFooterLayout
                contentClassName="@container grid w-full min-w-0 content-start gap-6"
                footer={
                    <AdminListPaginationBar
                        page={page}
                        pageCount={pageCount}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={(nextPage) => updateSearch({ ...search, page: nextPage })}
                        onPageSizeChange={(nextPageSize) =>
                            updateSearch({
                                ...search,
                                page: undefined,
                                pageSize: nextPageSize,
                            })
                        }
                    />
                }
            >
                <AdminCookInventoryListToolbar
                    search={search}
                    onSearchChange={updateSearch}
                    searchPlaceholder={
                        {
                            de: 'Titel, Beschreibung oder Koch suchen…',
                            en: 'Search title, description, or cook…',
                        }[locale]
                    }
                />

                {menus.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{{ de: 'Keine Menüs gefunden.', en: 'No menus found.' }[locale]}</p>
                ) : (
                    <ul className="grid auto-rows-fr grid-cols-1 gap-2 @3xl:grid-cols-2">
                        {menus.map((menu) => (
                            <li key={menu.menuId} className="min-w-0">
                                <CookMenuCard
                                    menu={menu}
                                    density="compact"
                                    to="/{-$locale}/admin/menus/$menuId"
                                    params={{ menuId: menu.menuId }}
                                    meta={
                                        <>
                                            <Link
                                                to="/{-$locale}/admin/users/$userId"
                                                params={{ userId: menu.cookId }}
                                                search={{ tab: 'menus' }}
                                                className="hover:underline"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                {menu.cookName}
                                            </Link>
                                            {' · '}
                                            {formatDate(menu.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                        </>
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
