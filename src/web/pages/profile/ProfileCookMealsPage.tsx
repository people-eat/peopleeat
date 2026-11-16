import { useNavigate } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { StatusAlert } from '../../components/base/status-alert';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { CookMealCard } from '../../components/CookMealCard';
import type { GqlCProfileCookMealsPageQuery } from '../../graphql/generated';
import { ProfileCookMealsPageUpdatesDocument, ProfileMealUpsertDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookStubRouteBySlug } from './cookCatalog';

const route = cookStubRouteBySlug('meals');

export const profileCookMealsPageTitle = route.title;
export const profileCookMealsPageDescription = route.description;

const MEAL_STATUS_FILTERS = ['published', 'draft'] as const;
const MEAL_SORTS = ['updated-desc', 'updated-asc', 'title-asc'] as const;

type MealStatusFilter = 'all' | (typeof MEAL_STATUS_FILTERS)[number];
type MealSort = (typeof MEAL_SORTS)[number];

export type ProfileMealsSearch = {
    q?: string;
    status?: (typeof MEAL_STATUS_FILTERS)[number];
    sort?: Exclude<MealSort, 'updated-desc'>;
};

export function parseProfileMealsSearch(search: Record<string, unknown>): ProfileMealsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const status = search.status === 'published' || search.status === 'draft' ? search.status : undefined;
    const sort = search.sort === 'updated-asc' || search.sort === 'title-asc' ? search.sort : undefined;
    return { q, status, sort };
}

function profileMealsSearchForUrl(next: { q?: string; status: MealStatusFilter; sort: MealSort }): ProfileMealsSearch {
    return {
        q: next.q?.trim() || undefined,
        status: next.status === 'all' ? undefined : next.status,
        sort: next.sort === 'updated-desc' ? undefined : next.sort,
    };
}

export function ProfileCookMealsPage({ data, search }: { data: GqlCProfileCookMealsPageQuery; search: ProfileMealsSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/profile/meals' });
    const publicationEnabled = useFeatureToggleActive('PUBLICATION_MEALS');
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookMealsPageUpdatesDocument);
    const [, upsertMeal] = useMutation(ProfileMealUpsertDocument);
    const [creating, setCreating] = useState(false);
    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    const statusFilter: MealStatusFilter = publicationEnabled ? (search.status ?? 'all') : 'all';
    const sort: MealSort = search.sort ?? 'updated-desc';

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({
            search: profileMealsSearchForUrl({ q: nextQ, status: statusFilter, sort }),
            replace: true,
        });
    }, [debouncedQ, navigate, search.q, statusFilter, sort]);

    function updateSearch(next: { q?: string; status: MealStatusFilter; sort: MealSort }) {
        void navigate({ search: profileMealsSearchForUrl(next) });
    }

    const meals = user?.cook?.meals ?? [];
    const publishedCount = meals.filter((meal) => meal.publishedAt != null).length;
    const draftCount = meals.length - publishedCount;
    const publishedWithoutImageCount = meals.filter(
        (meal) => meal.publishedAt != null && (meal.imageUrl == null || meal.imageUrl.length === 0),
    ).length;

    const query = (search.q ?? '').trim().toLowerCase();
    const filteredMeals = meals
        .filter((meal) => {
            if (statusFilter === 'published' && meal.publishedAt == null) return false;
            if (statusFilter === 'draft' && meal.publishedAt != null) return false;
            if (query.length === 0) return true;
            return meal.title.toLowerCase().includes(query) || meal.description.toLowerCase().includes(query);
        })
        .slice()
        .sort((a, b) => {
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

    const statusTabs: { value: MealStatusFilter; label: string; count: number }[] = [
        { value: 'all', label: t(locale, 'profileCook', 'actions.all'), count: meals.length },
        { value: 'published', label: t(locale, 'profileCook', 'meals.published'), count: publishedCount },
        { value: 'draft', label: t(locale, 'profileCook', 'meals.draft'), count: draftCount },
    ];

    async function onCreate() {
        setCreating(true);
        try {
            const result = await upsertMeal({});
            const mealId = result.data?.user.cook.mealUpsert.referenceId;
            if (!mealId || result.error) throw new Error('create failed');
            toast.success(t(locale, 'profileCook', 'meals.created'));
            await navigate({ to: '/{-$locale}/profile/meals/$mealId/edit', params: { mealId } });
        } catch {
            toast.error(t(locale, 'profileCook', 'actions.createFailed'));
        } finally {
            setCreating(false);
        }
    }

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            {publishedWithoutImageCount > 0 ? (
                <StatusAlert
                    tone="warning"
                    title={t(locale, 'profileCook', 'meals.withoutPictureTitle', { count: publishedWithoutImageCount })}
                >
                    {t(locale, 'profileCook', 'public.mealsWithoutPicture')}
                </StatusAlert>
            ) : null}

            {publicationEnabled ? (
                <Tabs
                    value={statusFilter}
                    onValueChange={(value) => updateSearch({ q: search.q, status: value as MealStatusFilter, sort })}
                >
                    <TabsList variant="line" aria-label={t(locale, 'profileCook', 'meals.publishStatus')}>
                        {statusTabs.map((tab) => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                                <Badge variant="outline" className="bg-muted">
                                    {tab.count}
                                </Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
                <Input
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={t(locale, 'profileCook', 'meals.searchPlaceholder')}
                    aria-label={t(locale, 'profileCook', 'meals.searchAria')}
                    className="min-w-0 flex-1 @md:max-w-xs"
                />
                <Select
                    value={sort}
                    onValueChange={(value) => updateSearch({ q: search.q, status: statusFilter, sort: value as MealSort })}
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
                <Button type="button" className="shrink-0" disabled={creating} onClick={() => void onCreate()}>
                    <PlusIcon className="size-4" />
                    {creating ? t(locale, 'profileCook', 'actions.creating') : t(locale, 'profileCook', 'meals.newMeal')}
                </Button>
            </div>

            {meals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'meals.empty')}</p>
            ) : filteredMeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'meals.noneFound')}</p>
            ) : (
                <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
                    {filteredMeals.map((meal) => (
                        <li key={meal.mealId} className="min-w-0">
                            <CookMealCard meal={meal} to="/{-$locale}/profile/meals/$mealId" params={{ mealId: meal.mealId }} />
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
