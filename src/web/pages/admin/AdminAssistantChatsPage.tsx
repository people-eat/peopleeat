import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Input } from '../../components/base/input';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminAssistantChatsPageQuery, GqlCChatSurface } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { adminChatSurfaceLabel } from './adminAssistantChats';
import { AdminAssistantChatsDataTable } from './AdminAssistantChatsDataTable';
import {
    adminListPageCount,
    adminListPageSize,
    adminListPaginationForUrl,
    adminListSkipTake,
    parseAdminListPage,
    parseAdminListPageSize,
} from './adminListPaginationSearch';
import type { AdminListPageSize } from './adminListPaginationSearch';

export const adminAssistantChatsPageTitle = { de: 'Assistent-Chat-Liste', en: 'Assistant chat list' } as const;
export const adminAssistantChatsPageDescription = {
    de: 'Assistent-Chats durchsuchen und einsehen.',
    en: 'Browse and inspect assistant chats.',
} as const;

const ADMIN_ASSISTANT_CHAT_SURFACES: GqlCChatSurface[] = ['admin', 'customer', 'cook'];

export type AdminAssistantChatsSearch = {
    q?: string;
    surface?: GqlCChatSurface;
    page?: number;
    pageSize?: AdminListPageSize;
};

function adminAssistantChatsSearchForUrl(search: AdminAssistantChatsSearch) {
    return {
        q: search.q,
        surface: search.surface,
        ...adminListPaginationForUrl(search),
    };
}

export function parseAdminAssistantChatsSearch(search: Record<string, unknown>): AdminAssistantChatsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const surface = search.surface === 'admin' || search.surface === 'customer' || search.surface === 'cook' ? search.surface : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    return { q, surface, page, pageSize };
}

export function adminAssistantChatsPageVariables(search: AdminAssistantChatsSearch) {
    return {
        criterion: {
            ...adminListSkipTake(search),
            searchText: search.q,
            surface: search.surface,
        },
    };
}

export function AdminAssistantChatsPage({ data, search }: { data: GqlCAdminAssistantChatsPageQuery; search: AdminAssistantChatsSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/assistant-chats/list' });
    const admin = data.currentSession.user?.admin;
    const chats = admin?.assistantChats ?? [];
    const total = admin?.assistantChatsCounts[0] ?? 0;
    const page = search.page ?? 1;
    const pageSize = adminListPageSize(search);
    const pageCount = adminListPageCount(total, pageSize);

    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({
            search: adminAssistantChatsSearchForUrl({
                ...search,
                q: nextQ,
                page: undefined,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search]);

    function updateSearch(next: AdminAssistantChatsSearch) {
        void navigate({
            search: adminAssistantChatsSearchForUrl(next),
        });
    }

    const surfaceTabs: { value: GqlCChatSurface | undefined; label: string }[] = [
        { value: undefined, label: { de: 'Alle', en: 'All' }[locale] },
        ...ADMIN_ASSISTANT_CHAT_SURFACES.map((surface) => ({
            value: surface,
            label: adminChatSurfaceLabel(surface, locale),
        })),
    ];

    return (
        <AdminPathPageChrome contentClassName="min-h-0 overflow-hidden gap-0">
            <AdminPinnedFooterLayout
                contentClassName="grid w-full content-start gap-6"
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
                <Tabs value={search.surface ?? 'all'}>
                    <TabsList variant="line" aria-label={{ de: 'Chat-Oberfläche', en: 'Chat surface' }[locale]}>
                        {surfaceTabs.map((tab) => (
                            <TabsTrigger key={tab.value ?? 'all'} value={tab.value ?? 'all'} asChild>
                                <Link
                                    to="/{-$locale}/admin/assistant-chats/list"
                                    search={adminAssistantChatsSearchForUrl({
                                        ...search,
                                        surface: tab.value,
                                        page: undefined,
                                    })}
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
                        placeholder={
                            {
                                de: 'Titel, Chat-ID oder Nutzer suchen…',
                                en: 'Search title, chat id, or user…',
                            }[locale]
                        }
                        aria-label={{ de: 'Assistent-Chats suchen', en: 'Search assistant chats' }[locale]}
                    />
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {
                            {
                                de: `${total} ${total === 1 ? 'Chat' : 'Chats'}`,
                                en: `${total} ${total === 1 ? 'chat' : 'chats'}`,
                            }[locale]
                        }
                    </p>
                </div>

                <AdminAssistantChatsDataTable data={chats} sorting={[]} onSortingChange={() => undefined} />
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
