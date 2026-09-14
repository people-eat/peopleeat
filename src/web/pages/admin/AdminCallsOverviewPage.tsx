import { Link, useNavigate } from '@tanstack/react-router';
import { ListIcon, VideoIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type { GqlCAdminCallListItemKind, GqlCAdminCallsOverviewPageQuery, GqlCAdminCallTrafficCriterion } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { adminCallsSectionTo } from './adminCalls';
import { AdminCallsAttentionBoard } from './AdminCallsAttentionBoard';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { adminOverviewLinkCardClassName } from './adminOverviewLinkCard';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';

export const adminCallsOverviewPageTitle = { de: 'Anrufe', en: 'Calls' } as const;
export const adminCallsOverviewPageDescription = {
    de: 'Live-Aufmerksamkeit, Verkehrsverteilung und Koch-Statistik.',
    en: 'Live attention, traffic distribution, and cook stats.',
} as const;

/**
 * Order matches `callTrafficCounts` indices on the overview query.
 * Indices 0–2 are current attention (no range); 3–6 are range-scoped outcomes.
 */
function adminCallsOverviewCountCriteria(range: { startDateTime: string; endDateTime: string }): GqlCAdminCallTrafficCriterion[] {
    return [
        { kinds: ['LIVE'] },
        { kinds: ['PENDING'] },
        { kinds: ['UPCOMING'] },
        { kinds: ['RECENT_SLOT'], range },
        { kinds: ['DECLINED'], range },
        { kinds: ['CANCELED'], range },
        { kinds: ['RECENT_ROOM'], range },
    ];
}

export function adminCallsOverviewPageVariables(search: AdminOverviewRangeSearch = {}) {
    const { range, granularity } = adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search));
    return {
        criteria: adminCallsOverviewCountCriteria(range),
        range,
        granularity,
        cookStatsTake: 10,
    };
}

function adminCallsListSearch({ kind, from, to }: { kind: GqlCAdminCallListItemKind | undefined; from?: string; to?: string }) {
    return {
        q: undefined,
        kind,
        initiator: undefined,
        cookId: undefined,
        page: undefined,
        sort: undefined,
        dir: undefined,
        from,
        to,
    };
}

export function AdminCallsOverviewPage({ data, search }: { data: GqlCAdminCallsOverviewPageQuery; search: AdminOverviewRangeSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/calls' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const [live = 0, pending = 0, upcoming = 0, completed = 0, declined = 0, canceled = 0, roomsEnded = 0] = admin?.callTrafficCounts ?? [];
    const buckets = admin?.callSlotCreations ?? [];
    const cookStats = admin?.callCookStats ?? [];
    const seedCalls = admin?.calls ?? [];

    const decided = completed + declined + canceled;
    const confirmRate = decided > 0 ? Math.round((completed / decided) * 100) : null;
    const declineRate = decided > 0 ? Math.round((declined / decided) * 100) : null;

    const distribution: {
        key: string;
        label: string;
        value: number;
        kind: GqlCAdminCallListItemKind;
        rangeScoped: boolean;
    }[] = [
        { key: 'live', label: { de: 'Live', en: 'Live' }[locale], value: live, kind: 'LIVE', rangeScoped: false },
        { key: 'pending', label: { de: 'Ausstehend', en: 'Pending' }[locale], value: pending, kind: 'PENDING', rangeScoped: false },
        { key: 'upcoming', label: { de: 'Bevorstehend', en: 'Upcoming' }[locale], value: upcoming, kind: 'UPCOMING', rangeScoped: false },
        {
            key: 'completed',
            label: { de: 'Erledigt', en: 'Completed' }[locale],
            value: completed,
            kind: 'RECENT_SLOT',
            rangeScoped: true,
        },
        { key: 'declined', label: { de: 'Abgelehnt', en: 'Declined' }[locale], value: declined, kind: 'DECLINED', rangeScoped: true },
        { key: 'canceled', label: { de: 'Storniert', en: 'Canceled' }[locale], value: canceled, kind: 'CANCELED', rangeScoped: true },
        {
            key: 'rooms',
            label: { de: 'Räume beendet', en: 'Rooms ended' }[locale],
            value: roomsEnded,
            kind: 'RECENT_ROOM',
            rangeScoped: true,
        },
    ];

    const pickerValue: DateRange = {
        from: new Date(`${range.from}T00:00:00`),
        to: new Date(`${range.to}T00:00:00`),
    };

    function onRangeChange(next: DateRange | undefined) {
        if (!next?.from || !next.to) return;
        void navigate({
            search: {
                from: formatIsoDate(next.from),
                to: formatIsoDate(next.to),
            },
        });
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="mx-auto grid w-full max-w-5xl content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <VideoIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminCallsOverviewPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminCallsOverviewPageDescription[locale]}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Bereiche', en: 'Sections' }[locale]}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard
                                to={adminCallsSectionTo('list')}
                                search={adminCallsListSearch({ kind: undefined })}
                                icon={ListIcon}
                            >
                                {{ de: 'Liste', en: 'List' }[locale]}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Aufmerksamkeit', en: 'Needs attention' }[locale]}</h2>
                    <AdminCallsAttentionBoard seedCalls={seedCalls} />
                </section>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2 className="text-lg font-medium">{{ de: 'Verteilung', en: 'Distribution' }[locale]}</h2>
                        <DateRangePicker
                            value={pickerValue}
                            onValueChange={onRangeChange}
                            locale={DATE_FNS_LOCALE[locale]}
                            placeholder={{ de: 'Zeitraum wählen', en: 'Pick a date range' }[locale]}
                            className="w-auto"
                            aria-label={{ de: 'Zeitraum für Anruf-Statistik', en: 'Date range for call statistics' }[locale]}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Live / Ausstehend / Bevorstehend sind aktuell. Erledigt, Abgelehnt, Storniert und beendete Räume gelten für den Zeitraum.',
                                en: 'Live / Pending / Upcoming are current. Completed, declined, canceled, and ended rooms use the selected range.',
                            }[locale]
                        }
                    </p>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {distribution.map((entry) => (
                            <AdminOverviewStatCard
                                key={entry.key}
                                label={entry.label}
                                value={entry.value}
                                to={adminCallsSectionTo('list')}
                                search={adminCallsListSearch({
                                    kind: entry.kind,
                                    from: entry.rangeScoped ? range.from : undefined,
                                    to: entry.rangeScoped ? range.to : undefined,
                                })}
                            />
                        ))}
                    </dl>
                    {confirmRate != null || declineRate != null ? (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: `Im Zeitraum: Bestätigungsquote ${confirmRate ?? '—'}% · Ablehnungsquote ${declineRate ?? '—'}% (bezogen auf erledigte + abgelehnte + stornierte Termine).`,
                                    en: `In range: confirm rate ${confirmRate ?? '—'}% · decline rate ${declineRate ?? '—'}% (of completed + declined + canceled slots).`,
                                }[locale]
                            }
                        </p>
                    ) : null}
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Terminanfragen', en: 'Slot requests' }[locale]}</h2>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={
                            {
                                de: 'Balkendiagramm der Terminanfragen im gewählten Zeitraum',
                                en: 'Bar chart of slot requests in the selected range',
                            }[locale]
                        }
                    />
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">
                        {{ de: 'Köche mit den meisten Anrufen', en: 'Cooks with the most calls' }[locale]}
                    </h2>
                    {cookStats.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {{ de: 'Keine Anruf-Aktivität im Zeitraum.', en: 'No call activity in this range.' }[locale]}
                        </p>
                    ) : (
                        <ul className="grid gap-2">
                            {cookStats.map((stat) => (
                                <li key={stat.cookId}>
                                    <Link
                                        to={adminCallsSectionTo('list')}
                                        search={{
                                            cookId: stat.cookId,
                                            q: undefined,
                                            kind: undefined,
                                            initiator: undefined,
                                            page: undefined,
                                            sort: undefined,
                                            dir: undefined,
                                            from: range.from,
                                            to: range.to,
                                        }}
                                        className={adminOverviewLinkCardClassName(
                                            'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                        )}
                                    >
                                        <span className="font-medium text-foreground">{stat.displayName}</span>
                                        <span className="text-sm text-muted-foreground tabular-nums">
                                            {
                                                {
                                                    de: `${stat.roomCount} Räume · ${stat.completedSlotCount} erledigt · ${stat.declinedCount} abgelehnt · ${stat.pendingAwaitingCookCount} wartend`,
                                                    en: `${stat.roomCount} rooms · ${stat.completedSlotCount} completed · ${stat.declinedCount} declined · ${stat.pendingAwaitingCookCount} awaiting`,
                                                }[locale]
                                            }
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
