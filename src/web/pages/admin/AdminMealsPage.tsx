import { Link, useNavigate } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { formatDate } from '../../../shared';
import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { CookMealCard } from '../../components/CookMealCard';
import type { GqlCAdminMealsPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import {
    adminCookInventoryListCriterion,
    adminCookInventoryListSearchForUrl,
    parseAdminCookInventoryListSearch,
} from './adminCookInventoryListSearch';
import type { AdminCookInventoryListSearch } from './adminCookInventoryListSearch';
import { AdminCookInventoryListToolbar } from './AdminCookInventoryListToolbar';
import { adminListPageCount, adminListPageSize } from './adminListPaginationSearch';

export function adminMealsPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.meals.title');
}
export function adminMealsPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'nav.meals.description');
}

export type AdminMealsSearch = AdminCookInventoryListSearch;

export function parseAdminMealsSearch(search: Record<string, unknown>): AdminMealsSearch {
    return parseAdminCookInventoryListSearch(search);
}

export function adminMealsPageVariables(search: AdminMealsSearch) {
    return {
        criterion: adminCookInventoryListCriterion(search, { includeImageFilter: true }),
    };
}

export function AdminMealsPage({ data, search }: { data: GqlCAdminMealsPageQuery; search: AdminMealsSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/meals' });
    const admin = data.currentSession.user?.admin;
    const meals = admin?.cookMeals ?? [];
    const total = admin?.cookMealsCounts[0] ?? 0;
    const page = search.page ?? 1;
    const pageSize = adminListPageSize(search);
    const pageCount = adminListPageCount(total, pageSize);

    function updateSearch(next: AdminMealsSearch) {
        void navigate({
            search: adminCookInventoryListSearchForUrl(next),
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
                    showImageFilter
                    searchPlaceholder={t(locale, 'admin', 'copy.searchTitleDescriptionOrCook')}
                />

                {meals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noMealsFound')}</p>
                ) : (
                    <ul className="grid grid-cols-1 gap-2 @3xl:grid-cols-2">
                        {meals.map((meal) => (
                            <li key={meal.mealId} className="min-w-0">
                                <CookMealCard
                                    meal={meal}
                                    density="compact"
                                    className="h-full hover:bg-muted/40"
                                    to="/{-$locale}/admin/meals/$mealId"
                                    params={{ mealId: meal.mealId }}
                                    meta={
                                        <>
                                            <Link
                                                to="/{-$locale}/admin/users/$userId"
                                                params={{ userId: meal.cookId }}
                                                search={{ tab: 'meals' }}
                                                className="hover:underline"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                {meal.cookName}
                                            </Link>
                                            {' · '}
                                            {formatDate(meal.createdAt, { locale, timeZone, dateStyle: 'medium' })}
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
