import { useNavigate } from '@tanstack/react-router';
import { AppWindowIcon, ListIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type { GqlCAdminSessionCriterion, GqlCAdminSessionKind, GqlCAdminSessionsOverviewPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { adminSessionKindLabel, adminSessionsSectionTo } from './adminSessions';

export const adminSessionsOverviewPageTitle = { de: 'Sitzungen', en: 'Sessions' } as const;
export const adminSessionsOverviewPageDescription = {
    de: 'Verteilung und Neuanlagen der Sitzungen.',
    en: 'Session distribution and creations.',
} as const;

/** Order matches `sessionCounts` indices on the overview query. */
const ADMIN_SESSION_COUNT_CRITERIA: GqlCAdminSessionCriterion[] = [{ kinds: ['human', 'bot'] }, { kinds: ['human'] }, { kinds: ['bot'] }];

export function adminSessionsOverviewPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        criteria: ADMIN_SESSION_COUNT_CRITERIA,
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
    };
}

function adminSessionsListSearch(kind: GqlCAdminSessionKind | undefined) {
    return {
        q: undefined,
        kind,
        page: undefined,
        sort: undefined,
        dir: undefined,
    };
}

export function AdminSessionsOverviewPage({
    data,
    search,
}: {
    data: GqlCAdminSessionsOverviewPageQuery;
    search: AdminOverviewRangeSearch;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/sessions' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const [total = 0, human = 0, bot = 0] = admin?.sessionCounts ?? [];
    const buckets = admin?.sessionCreations ?? [];

    const distribution: {
        key: 'total' | 'human' | 'bot';
        label: string;
        value: number;
        kind: GqlCAdminSessionKind | undefined;
    }[] = [
        {
            key: 'total',
            label: { de: 'Gesamt', en: 'Total' }[locale],
            value: total,
            kind: undefined,
        },
        {
            key: 'human',
            label: adminSessionKindLabel('human', locale),
            value: human,
            kind: 'human',
        },
        {
            key: 'bot',
            label: adminSessionKindLabel('bot', locale),
            value: bot,
            kind: 'bot',
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
                        <AppWindowIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminSessionsOverviewPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminSessionsOverviewPageDescription[locale]}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Bereiche', en: 'Sections' }[locale]}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard
                                to={adminSessionsSectionTo('list')}
                                search={adminSessionsListSearch(undefined)}
                                icon={ListIcon}
                            >
                                {{ de: 'Liste', en: 'List' }[locale]}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Verteilung', en: 'Distribution' }[locale]}</h2>
                    <dl className="grid grid-cols-3 gap-3">
                        {distribution.map((entry) => (
                            <AdminOverviewStatCard
                                key={entry.key}
                                label={entry.label}
                                value={entry.value}
                                to={adminSessionsSectionTo('list')}
                                search={adminSessionsListSearch(entry.kind)}
                            />
                        ))}
                    </dl>
                </section>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2 className="text-lg font-medium">{{ de: 'Neuanlagen', en: 'Creations' }[locale]}</h2>
                        <DateRangePicker
                            value={pickerValue}
                            onValueChange={onRangeChange}
                            locale={DATE_FNS_LOCALE[locale]}
                            placeholder={{ de: 'Zeitraum wählen', en: 'Pick a date range' }[locale]}
                            className="w-auto"
                            aria-label={{ de: 'Zeitraum für Sitzungs-Neuanlagen', en: 'Date range for session creations' }[locale]}
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={
                            {
                                de: 'Balkendiagramm der Sitzungs-Neuanlagen im gewählten Zeitraum',
                                en: 'Bar chart of session creations in the selected range',
                            }[locale]
                        }
                    />
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
