import { useNavigate } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { StatusAlert } from '../../components/base/status-alert';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { CookMealCard } from '../../components/CookMealCard';
import type { GqlCProfileCookMealsPageQuery } from '../../graphql/generated';
import { ProfileCookMealsPageUpdatesDocument, ProfileMealCreateDocument } from '../../graphql/generated';
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
    const [, createMeal] = useMutation(ProfileMealCreateDocument);
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
        { value: 'all', label: { de: 'Alle', en: 'All' }[locale], count: meals.length },
        { value: 'published', label: { de: 'Veröffentlicht', en: 'Published' }[locale], count: publishedCount },
        { value: 'draft', label: { de: 'Entwurf', en: 'Draft' }[locale], count: draftCount },
    ];

    async function onCreate() {
        setCreating(true);
        try {
            const result = await createMeal({});
            const mealId = result.data?.user.cook.mealCreate.referenceId;
            if (!mealId || result.error) throw new Error('create failed');
            toast.success({ de: 'Gericht angelegt.', en: 'Meal created.' }[locale]);
            await navigate({ to: '/{-$locale}/profile/meals/$mealId/edit', params: { mealId } });
        } catch {
            toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create.' }[locale]);
        } finally {
            setCreating(false);
        }
    }

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            {publishedWithoutImageCount > 0 ? (
                <StatusAlert
                    tone="warning"
                    title={
                        {
                            de:
                                publishedWithoutImageCount === 1
                                    ? '1 veröffentlichtes Gericht ohne Bild'
                                    : `${publishedWithoutImageCount} veröffentlichte Gerichte ohne Bild`,
                            en:
                                publishedWithoutImageCount === 1
                                    ? '1 published meal without a picture'
                                    : `${publishedWithoutImageCount} published meals without a picture`,
                        }[locale]
                    }
                >
                    {
                        {
                            de: 'Gerichte ohne Bild erscheinen nicht auf deiner öffentlichen Kochseite.',
                            en: 'Meals without a picture do not appear on your public cook page.',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            {publicationEnabled ? (
                <Tabs
                    value={statusFilter}
                    onValueChange={(value) => updateSearch({ q: search.q, status: value as MealStatusFilter, sort })}
                >
                    <TabsList variant="line" aria-label={{ de: 'Veröffentlichungsstatus', en: 'Publish status' }[locale]}>
                        {statusTabs.map((tab) => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                                <Badge variant="secondary">{tab.count}</Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
                <Input
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={{ de: 'Gerichte suchen…', en: 'Search meals…' }[locale]}
                    aria-label={{ de: 'Gerichte suchen', en: 'Search meals' }[locale]}
                    className="min-w-0 flex-1 @md:max-w-xs"
                />
                <Select
                    value={sort}
                    onValueChange={(value) => updateSearch({ q: search.q, status: statusFilter, sort: value as MealSort })}
                >
                    <SelectTrigger className="w-full @md:w-48" aria-label={{ de: 'Sortierung', en: 'Sort order' }[locale]}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="updated-desc">{{ de: 'Zuletzt aktualisiert', en: 'Recently updated' }[locale]}</SelectItem>
                        <SelectItem value="updated-asc">{{ de: 'Älteste zuerst', en: 'Oldest first' }[locale]}</SelectItem>
                        <SelectItem value="title-asc">{{ de: 'Titel A–Z', en: 'Title A–Z' }[locale]}</SelectItem>
                    </SelectContent>
                </Select>
                <Button type="button" className="shrink-0" disabled={creating} onClick={() => void onCreate()}>
                    <PlusIcon className="size-4" />
                    {
                        {
                            de: creating ? 'Wird angelegt…' : 'Neues Gericht',
                            en: creating ? 'Creating…' : 'New meal',
                        }[locale]
                    }
                </Button>
            </div>

            {meals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{{ de: 'Noch keine Gerichte.', en: 'No meals yet.' }[locale]}</p>
            ) : filteredMeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{{ de: 'Keine Gerichte gefunden.', en: 'No meals found.' }[locale]}</p>
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
