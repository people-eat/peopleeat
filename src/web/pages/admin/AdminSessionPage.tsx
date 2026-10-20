import { Link, useNavigate } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { AppWindowIcon, CheckIcon, CopyIcon, ExternalLinkIcon, LayersIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { formatDate, userDisplayName } from '../../../shared';
import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { AdminSessionEventTimeline } from '../../components/AdminSessionEventTimeline';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/base/avatar';
import { Button } from '../../components/base/button';
import { Separator } from '../../components/base/separator';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
import type { GqlCAdminSessionPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import {
    adminListPageCount,
    adminListPageSize,
    adminListPaginationForUrl,
    adminListSkipTake,
    parseAdminListPage,
    parseAdminListPageSize,
} from './adminListPaginationSearch';
import type { AdminListPageSize } from './adminListPaginationSearch';

export const adminSessionPageTitle = { de: 'Sitzung', en: 'Session' } as const;
export const adminSessionPageDescription = {
    de: 'Details einer Browser-Sitzung.',
    en: 'Details for a browser session.',
} as const;

const SESSION_TABS = ['overview', 'events'] as const;

export type AdminSessionTab = (typeof SESSION_TABS)[number];

export type AdminSessionSearch = {
    tab?: AdminSessionTab;
    page?: number;
    pageSize?: AdminListPageSize;
};

function isAdminSessionTab(value: unknown): value is AdminSessionTab {
    return typeof value === 'string' && (SESSION_TABS as readonly string[]).includes(value);
}

function adminSessionSearchForUrl(search: AdminSessionSearch) {
    const tab = search.tab && search.tab !== 'overview' ? search.tab : undefined;
    return {
        tab,
        ...(tab === 'events' ? adminListPaginationForUrl(search) : {}),
    };
}

export function parseAdminSessionSearch(search: Record<string, unknown>): AdminSessionSearch {
    const tab = isAdminSessionTab(search.tab) ? search.tab : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    return {
        tab,
        ...(tab === 'events' ? { page, pageSize } : {}),
    };
}

export function adminSessionPageVariables(sessionId: string, search: AdminSessionSearch) {
    const tab = search.tab ?? 'overview';
    const eventsPagination = tab === 'events' ? adminListSkipTake(search) : { skip: 0, take: 25 };
    return {
        sessionId,
        includeEvents: tab === 'events',
        eventsCriterion: {
            sessionIds: [sessionId],
            ...eventsPagination,
        },
    };
}

type AdminSessionDetail = NonNullable<NonNullable<NonNullable<GqlCAdminSessionPageQuery['currentSession']['user']>['admin']>['session']>;

type AdminSessionTabDef = {
    id: AdminSessionTab;
    label: Record<Locale, string>;
    Icon: LucideIcon;
};

const ADMIN_SESSION_TABS: readonly AdminSessionTabDef[] = [
    { id: 'overview', label: { de: 'Übersicht', en: 'Overview' }, Icon: AppWindowIcon },
    { id: 'events', label: { de: 'Ereignisse', en: 'Events' }, Icon: LayersIcon },
];

function resolveAdminSessionTab(tab: AdminSessionTab | undefined): AdminSessionTab {
    if (!tab || !isAdminSessionTab(tab)) return 'overview';
    return tab;
}

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

export function AdminSessionPage({
    data,
    search,
    sessionId,
}: {
    data: GqlCAdminSessionPageQuery;
    search: AdminSessionSearch;
    sessionId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/sessions/$sessionId' });
    const admin = data.currentSession.user?.admin;
    const session = admin?.session ?? null;
    const events = admin?.sessionEvents ?? [];
    const eventsTotal = admin?.sessionEventsCounts?.[0] ?? 0;
    const crumbLabel = session?.user ? userDisplayName(session.user) : adminSessionPageTitle[locale];
    const tab = resolveAdminSessionTab(search.tab);
    const eventsPage = search.page ?? 1;
    const eventsPageSize = adminListPageSize(search);
    const eventsPageCount = adminListPageCount(eventsTotal, eventsPageSize);

    function updateSearch(next: AdminSessionSearch) {
        void navigate({
            search: adminSessionSearchForUrl(next),
        });
    }

    const footer =
        tab === 'events' ? (
            <AdminListPaginationBar
                page={eventsPage}
                pageCount={eventsPageCount}
                pageSize={eventsPageSize}
                total={eventsTotal}
                onPageChange={(nextPage) => updateSearch({ ...search, tab, page: nextPage })}
                onPageSizeChange={(nextPageSize) =>
                    updateSearch({
                        ...search,
                        tab,
                        page: undefined,
                        pageSize: nextPageSize,
                    })
                }
            />
        ) : undefined;

    return (
        <AdminPageChrome
            crumbs={[{ label: { de: 'Sitzungen', en: 'Sessions' }[locale], to: '/{-$locale}/admin/sessions' }, { label: crumbLabel }]}
            contentClassName="min-h-0 overflow-hidden gap-0"
        >
            {session ? (
                <AdminPinnedFooterLayout footer={footer} contentClassName="grid w-full content-start gap-6">
                    <Tabs value={tab}>
                        <TabsList variant="line" aria-label={{ de: 'Sitzungsbereiche', en: 'Session sections' }[locale]}>
                            {ADMIN_SESSION_TABS.map(({ id, label, Icon }) => (
                                <TabsTrigger key={id} value={id} asChild>
                                    <Link
                                        to="/{-$locale}/admin/sessions/$sessionId"
                                        params={{ sessionId }}
                                        search={adminSessionSearchForUrl({ tab: id })}
                                        replace
                                    >
                                        <Icon aria-hidden />
                                        {label[locale]}
                                    </Link>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {tab === 'overview' ? (
                        <AdminSessionOverviewFields session={session} />
                    ) : (
                        <AdminSessionEventTimeline
                            events={events}
                            emptyLabel={{ de: 'Keine Ereignisse für diese Sitzung.', en: 'No events for this session.' }[locale]}
                        />
                    )}
                </AdminPinnedFooterLayout>
            ) : (
                <main id="main-content" className="grid w-full content-start gap-6 px-4 pb-6">
                    <p className="text-sm text-muted-foreground">{{ de: 'Sitzung nicht gefunden.', en: 'Session not found.' }[locale]}</p>
                </main>
            )}
        </AdminPageChrome>
    );
}

function AdminSessionOverviewFields({ session }: { session: AdminSessionDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const empty = { de: '-', en: '-' }[locale];
    const yes = { de: 'Ja', en: 'Yes' }[locale];
    const no = { de: 'Nein', en: 'No' }[locale];
    const lastInteraction = formatDate(session.lastInteractionAt, { locale, timeZone, dateStyle: 'long' });
    const created = formatDate(session.createdAt, { locale, timeZone, dateStyle: 'long' });
    const terminated = session.wasTerminatedAt ? formatDate(session.wasTerminatedAt, { locale, timeZone, dateStyle: 'long' }) : empty;
    const connectionActive = session.connectionActive ? yes : no;
    const isBot = session.isBot ? yes : no;
    const userAgent = session.userAgent ?? empty;
    const ipHash = session.ipHash ?? empty;
    const referrer = session.referrer ?? empty;
    const landingPath = session.landingPath ?? empty;

    return (
        <dl className="grid gap-4">
            <DetailField
                label={{ de: 'Sitzungs-ID', en: 'Session ID' }[locale]}
                value={session.sessionId}
                mono
                copyText={session.sessionId}
            />
            <Separator />
            <AdminSessionUserField session={session} />
            <Separator />
            <DetailField
                label={{ de: 'Zuletzt aktiv', en: 'Last interaction' }[locale]}
                value={lastInteraction}
                copyText={lastInteraction}
            />
            <Separator />
            <DetailField label={{ de: 'Erstellt', en: 'Created' }[locale]} value={created} copyText={created} />
            <Separator />
            <DetailField
                label={{ de: 'Beendet', en: 'Terminated' }[locale]}
                value={terminated}
                copyText={session.wasTerminatedAt ? terminated : undefined}
            />
            <Separator />
            <DetailField
                label={{ de: 'Verbindung aktiv', en: 'Connection active' }[locale]}
                value={connectionActive}
                copyText={connectionActive}
            />
            <Separator />
            <DetailField label={{ de: 'Bot', en: 'Bot' }[locale]} value={isBot} copyText={isBot} />
            <Separator />
            <DetailField
                label={{ de: 'User-Agent', en: 'User agent' }[locale]}
                value={userAgent}
                copyText={session.userAgent ?? undefined}
            />
            <Separator />
            <DetailField label={{ de: 'IP-Hash', en: 'IP hash' }[locale]} value={ipHash} mono copyText={session.ipHash ?? undefined} />
            <Separator />
            <DetailField label={{ de: 'Referrer', en: 'Referrer' }[locale]} value={referrer} copyText={session.referrer ?? undefined} />
            <Separator />
            <DetailField
                label={{ de: 'Einstiegspfad', en: 'Landing path' }[locale]}
                value={landingPath}
                mono
                copyText={session.landingPath ?? undefined}
            />
        </dl>
    );
}

function AdminSessionUserField({ session }: { session: AdminSessionDetail }) {
    const locale = useLocale();
    const anonymousLabel = { de: 'Anonym', en: 'Anonymous' }[locale];
    const openUserLabel = { de: 'Nutzer öffnen', en: 'Open user' }[locale];

    if (!session.user) {
        const fallback = session.userId ?? anonymousLabel;
        return (
            <DetailField
                label={{ de: 'Nutzer', en: 'User' }[locale]}
                value={<span className="text-muted-foreground">{fallback}</span>}
                copyText={session.userId ?? undefined}
            />
        );
    }

    const displayName = userDisplayName(session.user);
    const profilePictureUrl = session.user.profilePicture?.url ?? null;

    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{{ de: 'Nutzer', en: 'User' }[locale]}</dt>
            <dd className="flex min-w-0 items-center gap-3">
                <Avatar className="size-10 shrink-0">
                    {profilePictureUrl ? <AvatarImage src={profilePictureUrl} alt="" className="object-cover" /> : null}
                    <AvatarFallback>{initialsFromName(displayName)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{displayName}</span>
                <div className="flex shrink-0 items-center gap-0.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-xs" asChild className="opacity-70 hover:opacity-100">
                                <Link
                                    to="/{-$locale}/admin/users/$userId"
                                    params={{ userId: session.user.userId }}
                                    aria-label={openUserLabel}
                                >
                                    <ExternalLinkIcon aria-hidden />
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{openUserLabel}</TooltipContent>
                    </Tooltip>
                    <CopyValueButton text={session.user.userId} />
                </div>
            </dd>
        </div>
    );
}

function CopyValueButton({ text }: { text: string }) {
    const locale = useLocale();
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleLabel = { de: 'Kopieren', en: 'Copy' }[locale];
    const ariaLabel = copied ? { de: 'Kopiert', en: 'Copied' }[locale] : idleLabel;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success({ de: 'In die Zwischenablage kopiert', en: 'Copied to clipboard' }[locale]);
        } catch {
            toast.error({ de: 'Kopieren in die Zwischenablage fehlgeschlagen', en: 'Could not copy to clipboard' }[locale]);
        }
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
    }, [text, locale]);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={ariaLabel}
                    onClick={() => void onCopy()}
                    className="opacity-70 hover:opacity-100"
                >
                    {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{ariaLabel}</TooltipContent>
        </Tooltip>
    );
}

function DetailField({ label, value, mono, copyText }: { label: string; value: ReactNode; mono?: boolean; copyText?: string }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="flex min-w-0 items-start gap-1">
                <div
                    className={
                        mono ? 'min-w-0 flex-1 font-mono text-sm break-all text-foreground' : 'min-w-0 flex-1 text-sm text-foreground'
                    }
                >
                    {value}
                </div>
                {copyText != null ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                        <CopyValueButton text={copyText} />
                    </div>
                ) : null}
            </dd>
        </div>
    );
}
