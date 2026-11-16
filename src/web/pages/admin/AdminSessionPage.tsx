import { Link, useNavigate } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { AppWindowIcon, CheckIcon, CopyIcon, ExternalLinkIcon, LayersIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { t } from '../../../i18n/t';
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

export function adminSessionPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.session.title');
}
export function adminSessionPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.session.description');
}

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
    labelKey: 'session.tabs.overview' | 'session.tabs.events';
    Icon: LucideIcon;
};

const ADMIN_SESSION_TABS: readonly AdminSessionTabDef[] = [
    { id: 'overview', labelKey: 'session.tabs.overview', Icon: AppWindowIcon },
    { id: 'events', labelKey: 'session.tabs.events', Icon: LayersIcon },
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
    const crumbLabel = session?.user ? userDisplayName(session.user) : adminSessionPageTitle(locale);
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
            crumbs={[{ label: t(locale, 'admin', 'copy.sessions'), to: '/{-$locale}/admin/sessions' }, { label: crumbLabel }]}
            contentClassName="min-h-0 overflow-hidden gap-0"
        >
            {session ? (
                <AdminPinnedFooterLayout footer={footer} contentClassName="grid w-full content-start gap-6">
                    <Tabs value={tab}>
                        <TabsList variant="line" aria-label={t(locale, 'admin', 'copy.sessionSections')}>
                            {ADMIN_SESSION_TABS.map(({ id, labelKey, Icon }) => (
                                <TabsTrigger key={id} value={id} asChild>
                                    <Link
                                        to="/{-$locale}/admin/sessions/$sessionId"
                                        params={{ sessionId }}
                                        search={adminSessionSearchForUrl({ tab: id })}
                                        replace
                                    >
                                        <Icon aria-hidden />
                                        {t(locale, 'admin', labelKey)}
                                    </Link>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {tab === 'overview' ? (
                        <AdminSessionOverviewFields session={session} />
                    ) : (
                        <AdminSessionEventTimeline events={events} emptyLabel={t(locale, 'admin', 'copy.noEventsForThisSession')} />
                    )}
                </AdminPinnedFooterLayout>
            ) : (
                <main id="main-content" className="grid w-full content-start gap-6 px-4 pb-6">
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.sessionNotFound')}</p>
                </main>
            )}
        </AdminPageChrome>
    );
}

function AdminSessionOverviewFields({ session }: { session: AdminSessionDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const empty = t(locale, 'admin', 'copy.empty2');
    const yes = t(locale, 'admin', 'copy.yes');
    const no = t(locale, 'admin', 'copy.no');
    const lastInteraction = formatDate(session.lastInteractionAt, { locale, timeZone, dateStyle: 'long' });
    const created = formatDate(session.createdAt, { locale, timeZone, dateStyle: 'long' });
    const terminated = session.wasTerminatedAt ? formatDate(session.wasTerminatedAt, { locale, timeZone, dateStyle: 'long' }) : empty;
    const connectionActive = session.connectionActive ? yes : no;
    const isBot = session.isBot ? yes : no;
    const isImpersonation = session.isImpersonation ? yes : no;
    const userAgent = session.userAgent ?? empty;
    const ipHash = session.ipHash ?? empty;
    const referrer = session.referrer ?? empty;
    const landingPath = session.landingPath ?? empty;

    return (
        <dl className="grid gap-4">
            <DetailField label={t(locale, 'admin', 'copy.sessionId')} value={session.sessionId} mono copyText={session.sessionId} />
            <Separator />
            <AdminSessionUserField session={session} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.lastInteraction')} value={lastInteraction} copyText={lastInteraction} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.created')} value={created} copyText={created} />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.terminated')}
                value={terminated}
                copyText={session.wasTerminatedAt ? terminated : undefined}
            />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.connectionActive')} value={connectionActive} copyText={connectionActive} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.bot')} value={isBot} copyText={isBot} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.impersonation')} value={isImpersonation} copyText={isImpersonation} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.userAgent')} value={userAgent} copyText={session.userAgent ?? undefined} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.ipHash')} value={ipHash} mono copyText={session.ipHash ?? undefined} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.referrer')} value={referrer} copyText={session.referrer ?? undefined} />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.landingPath')}
                value={landingPath}
                mono
                copyText={session.landingPath ?? undefined}
            />
        </dl>
    );
}

function AdminSessionUserField({ session }: { session: AdminSessionDetail }) {
    const locale = useLocale();
    const anonymousLabel = t(locale, 'admin', 'copy.anonymous');
    const openUserLabel = t(locale, 'admin', 'copy.openUser');

    if (!session.user) {
        const fallback = session.userId ?? anonymousLabel;
        return (
            <DetailField
                label={t(locale, 'admin', 'copy.user')}
                value={<span className="text-muted-foreground">{fallback}</span>}
                copyText={session.userId ?? undefined}
            />
        );
    }

    const displayName = userDisplayName(session.user);
    const profilePictureUrl = session.user.profilePicture?.url ?? null;

    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.user')}</dt>
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
    const idleLabel = t(locale, 'admin', 'copy.copy');
    const ariaLabel = copied ? t(locale, 'admin', 'copy.copied') : idleLabel;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(t(locale, 'admin', 'copy.copiedToClipboard'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotCopyToClipboard'));
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
