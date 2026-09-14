import { Link, useNavigate } from '@tanstack/react-router';
import type { SortingState, Updater } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Input } from '../../components/base/input';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminAiGenerationKind, GqlCAdminAiGenerationsPageQuery } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { ADMIN_AI_GENERATION_KINDS, ADMIN_AI_GENERATIONS_SORT_FIELDS, adminAiGenerationKindLabel } from './adminAiGenerationsColumns';
import type { AdminAiGenerationsSortField } from './adminAiGenerationsColumns';
import { AdminAiGenerationsDataTable } from './AdminAiGenerationsDataTable';
import {
    adminListSortFromSortingState,
    adminListSortingState,
    adminListSortSearchForUrl,
    adminListSortToCriterion,
    parseAdminListSortSearch,
} from './adminListSortSearch';

export const adminAiGenerationsPageTitle = { de: 'AI-Generierungen-Liste', en: 'AI generations list' } as const;
export const adminAiGenerationsPageDescription = {
    de: 'One-Shot-AI-Aufrufe durchsuchen und einsehen.',
    en: 'Browse and inspect one-shot AI calls.',
} as const;

const ADMIN_AI_GENERATIONS_PAGE_SIZE = 25;

export type AdminAiGenerationsSearch = {
    q?: string;
    kind?: GqlCAdminAiGenerationKind;
    page?: number;
    sort?: AdminAiGenerationsSortField;
    dir?: 'asc' | 'desc';
};

function isAdminAiGenerationKind(value: unknown): value is GqlCAdminAiGenerationKind {
    return typeof value === 'string' && (ADMIN_AI_GENERATION_KINDS as readonly string[]).includes(value);
}

export function parseAdminAiGenerationsSearch(search: Record<string, unknown>): AdminAiGenerationsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const kind = isAdminAiGenerationKind(search.kind) ? search.kind : undefined;
    const pageRaw = typeof search.page === 'number' ? search.page : typeof search.page === 'string' ? Number(search.page) : undefined;
    const page = pageRaw != null && Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : undefined;
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_AI_GENERATIONS_SORT_FIELDS);
    return { q, kind, page, sort, dir };
}

export function adminAiGenerationsPageVariables(search: AdminAiGenerationsSearch) {
    const page = search.page ?? 1;
    return {
        criterion: {
            skip: (page - 1) * ADMIN_AI_GENERATIONS_PAGE_SIZE,
            take: ADMIN_AI_GENERATIONS_PAGE_SIZE,
            searchText: search.q,
            kinds: search.kind ? [search.kind] : [...ADMIN_AI_GENERATION_KINDS],
            ...adminListSortToCriterion(search),
        },
    };
}

export function AdminAiGenerationsPage({ data, search }: { data: GqlCAdminAiGenerationsPageQuery; search: AdminAiGenerationsSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/ai-generations/list' });
    const admin = data.currentSession.user?.admin;
    const generations = admin?.aiGenerations ?? [];
    const total = admin?.aiGenerationCounts[0] ?? 0;
    const page = search.page ?? 1;
    const pageCount = Math.max(1, Math.ceil(total / ADMIN_AI_GENERATIONS_PAGE_SIZE));
    const sorting = adminListSortingState(search);

    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({
            search: {
                q: nextQ,
                kind: search.kind,
                page: undefined,
                ...adminListSortSearchForUrl(search),
            },
            replace: true,
        });
    }, [debouncedQ, navigate, search.q, search.kind, search.sort, search.dir]);

    function updateSearch(next: AdminAiGenerationsSearch) {
        void navigate({
            search: {
                q: next.q,
                kind: next.kind,
                page: next.page && next.page > 1 ? next.page : undefined,
                ...adminListSortSearchForUrl(next),
            },
        });
    }

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSort = adminListSortFromSortingState(updater, sorting, ADMIN_AI_GENERATIONS_SORT_FIELDS);
        updateSearch({ ...search, page: undefined, sort: nextSort.sort, dir: nextSort.dir });
    }

    const kindTabs: { value: GqlCAdminAiGenerationKind | undefined; label: string }[] = [
        { value: undefined, label: { de: 'Alle', en: 'All' }[locale] },
        ...ADMIN_AI_GENERATION_KINDS.map((kind) => ({
            value: kind,
            label: adminAiGenerationKindLabel(kind, locale),
        })),
    ];

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-6">
                <Tabs value={search.kind ?? 'all'}>
                    <TabsList variant="line" aria-label={{ de: 'AI-Art', en: 'AI kind' }[locale]}>
                        {kindTabs.map((tab) => (
                            <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/ai-generations/list"
                                    search={{
                                        q: search.q,
                                        kind: tab.value,
                                        page: undefined,
                                        ...adminListSortSearchForUrl(search),
                                    }}
                                    replace
                                >
                                    {tab.label}
                                </Link>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <Input
                        type="search"
                        value={draftQ}
                        onChange={(event) => setDraftQ(event.target.value)}
                        placeholder={{ de: 'System, Prompt oder Output suchen…', en: 'Search system, prompt, or output…' }[locale]}
                        aria-label={{ de: 'AI-Generierungen suchen', en: 'Search AI generations' }[locale]}
                    />
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {
                            {
                                de: `${total} ${total === 1 ? 'Aufruf' : 'Aufrufe'}`,
                                en: `${total} ${total === 1 ? 'call' : 'calls'}`,
                            }[locale]
                        }
                    </p>
                </div>

                <AdminAiGenerationsDataTable
                    data={generations}
                    page={page}
                    pageCount={pageCount}
                    sorting={sorting}
                    onSortingChange={onSortingChange}
                    onPageChange={(nextPage) => updateSearch({ ...search, page: nextPage })}
                />
            </main>
        </AdminPathPageChrome>
    );
}
