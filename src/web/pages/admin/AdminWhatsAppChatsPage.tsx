import { Link, useNavigate } from '@tanstack/react-router';
import { MessageSquareIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { userDisplayName } from '../../../shared';
import { formatInboxListTimestamp } from '../../chat/formatInboxListTimestamp';
import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/base/avatar';
import { Input } from '../../components/base/input';
import { NotificationBadge } from '../../components/base/notification-badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminWhatsAppChatsPageAdminFragment, GqlCAdminWhatsAppChatsPageQuery } from '../../graphql/generated';
import { AdminWhatsAppChatsPageUpdatesDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { cn } from '../../utils/cn';
import { adminStubRouteBySlug } from './adminCatalog';
import {
    adminListPageCount,
    adminListPageSize,
    adminListPaginationForUrl,
    adminListSkipTake,
    parseAdminListPage,
    parseAdminListPageSize,
} from './adminListPaginationSearch';
import type { AdminListPageSize } from './adminListPaginationSearch';
import { adminOverviewLinkCardClassName } from './adminOverviewLinkCard';

const route = adminStubRouteBySlug('whats-app-chats');

export const adminWhatsAppChatsPageTitle = route.title;
export const adminWhatsAppChatsPageDescription = route.description;

export type AdminWhatsAppChatsSearch = {
    q?: string;
    unread?: boolean;
    page?: number;
    pageSize?: AdminListPageSize;
};

function adminWhatsAppChatsSearchForUrl(search: AdminWhatsAppChatsSearch) {
    return {
        q: search.q,
        unread: search.unread || undefined,
        ...adminListPaginationForUrl(search),
    };
}

export function parseAdminWhatsAppChatsSearch(search: Record<string, unknown>): AdminWhatsAppChatsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const unread = search.unread === true || search.unread === '1' || search.unread === 'true' ? true : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    return { q, unread, page, pageSize };
}

export function adminWhatsAppChatsPageVariables(search: AdminWhatsAppChatsSearch) {
    const { skip, take } = adminListSkipTake(search);
    const criterion = {
        skip,
        take,
        searchText: search.q,
        hasAdminUnread: search.unread ? true : undefined,
    };
    return {
        criterion,
        countsCriterion: {
            searchText: search.q,
            hasAdminUnread: search.unread ? true : undefined,
        },
    };
}

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

export function AdminWhatsAppChatsPage({ data, search }: { data: GqlCAdminWhatsAppChatsPageQuery; search: AdminWhatsAppChatsSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/whats-app-chats' });
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState<GqlCAdminWhatsAppChatsPageAdminFragment | null>(seedAdmin);

    useEffect(() => {
        setAdmin(seedAdmin);
    }, [seedAdmin]);

    useEffect(() => {
        if (!seedAdmin) return;
        const pageVariables = adminWhatsAppChatsPageVariables(search);
        const request = createRequest(AdminWhatsAppChatsPageUpdatesDocument, pageVariables);
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seedAdmin, search]);

    const conversations = admin?.whatsAppConversations ?? [];
    const total = admin?.whatsAppConversationsCounts[0] ?? 0;
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
            search: adminWhatsAppChatsSearchForUrl({
                q: nextQ,
                unread: search.unread,
                page: undefined,
                pageSize: search.pageSize,
            }),
            replace: true,
        });
    }, [debouncedQ, navigate, search.q, search.unread, search.pageSize]);

    function updateSearch(next: AdminWhatsAppChatsSearch) {
        void navigate({
            search: adminWhatsAppChatsSearchForUrl(next),
            replace: true,
        });
    }

    const tab = search.unread ? 'unread' : 'all';

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
                <div className="grid gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <MessageSquareIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminWhatsAppChatsPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminWhatsAppChatsPageDescription[locale]}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="search"
                        value={draftQ}
                        onChange={(event) => setDraftQ(event.target.value)}
                        placeholder={
                            {
                                de: 'Telefon, Name oder Nutzer suchen…',
                                en: 'Search phone, name, or user…',
                            }[locale]
                        }
                        className="min-w-48 max-w-md flex-1"
                        aria-label={
                            {
                                de: 'WhatsApp-Chats suchen',
                                en: 'Search WhatsApp chats',
                            }[locale]
                        }
                    />
                    <Tabs
                        value={tab}
                        onValueChange={(value) => {
                            if (value === 'unread') updateSearch({ ...search, unread: true, page: undefined });
                            else updateSearch({ ...search, unread: undefined, page: undefined });
                        }}
                    >
                        <TabsList>
                            <TabsTrigger value="all">{{ de: 'Alle', en: 'All' }[locale]}</TabsTrigger>
                            <TabsTrigger value="unread">{{ de: 'Ungelesen', en: 'Unread' }[locale]}</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {conversations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{{ de: 'Keine WhatsApp-Chats.', en: 'No WhatsApp chats.' }[locale]}</p>
                ) : (
                    <ul className="grid auto-rows-fr grid-cols-1 gap-2 @2xl:grid-cols-2 @5xl:grid-cols-3">
                        {conversations.map((conversation) => {
                            const title = conversation.customer
                                ? userDisplayName(conversation.customer)
                                : conversation.displayName?.trim() || conversation.phoneNumber;
                            const preview = conversation.lastMessagePreview.trim() || { de: 'Medien', en: 'Media' }[locale];
                            const profilePictureUrl = conversation.customer?.profilePicture?.url ?? null;
                            const unread = conversation.adminUnreadCount > 0;
                            return (
                                <li key={conversation.whatsAppConversationId} className="min-h-0">
                                    <Link
                                        to="/{-$locale}/admin/whats-app-chats/$whatsAppConversationId"
                                        params={{ whatsAppConversationId: conversation.whatsAppConversationId }}
                                        className={adminOverviewLinkCardClassName(
                                            'flex h-full min-h-0 items-stretch overflow-hidden p-0 text-foreground',
                                        )}
                                    >
                                        <span className="flex shrink-0 items-center self-stretch p-2">
                                            <Avatar className="size-16">
                                                {profilePictureUrl ? (
                                                    <AvatarImage src={profilePictureUrl} alt="" className="object-cover" />
                                                ) : null}
                                                <AvatarFallback className="text-base">{initialsFromName(title)}</AvatarFallback>
                                            </Avatar>
                                        </span>
                                        <span className="flex min-w-0 flex-1 items-stretch gap-2 p-3">
                                            <span className="grid min-w-0 flex-1 content-center gap-0.5">
                                                <span
                                                    className={cn(
                                                        'min-w-0 truncate text-sm',
                                                        unread ? 'font-semibold text-foreground' : 'font-medium text-foreground',
                                                    )}
                                                >
                                                    {title}
                                                </span>
                                                <span className="line-clamp-2 min-h-10 text-sm/5 text-muted-foreground">{preview}</span>
                                            </span>
                                            <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                                                <span
                                                    className={cn(
                                                        'text-xs tabular-nums',
                                                        unread ? 'font-medium text-foreground' : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {formatInboxListTimestamp(conversation.lastMessageAt, { locale, timeZone })}
                                                </span>
                                                <NotificationBadge
                                                    count={conversation.adminUnreadCount}
                                                    label={
                                                        {
                                                            de: `${conversation.adminUnreadCount} ungelesene Nachrichten`,
                                                            en: `${conversation.adminUnreadCount} unread messages`,
                                                        }[locale]
                                                    }
                                                    placement="inline"
                                                    className="size-5 bg-green-500 text-[11px] shadow-none"
                                                />
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
