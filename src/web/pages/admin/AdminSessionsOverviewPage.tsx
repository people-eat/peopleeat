import { useNavigate } from '@tanstack/react-router';
import { AppWindowIcon, ListIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { t } from '../../../i18n/t';
import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type { GqlCAdminSessionCriterion, GqlCAdminSessionKind, GqlCAdminSessionsOverviewPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { adminSessionKindLabel, adminSessionsSectionTo } from './adminSessions';

export function adminSessionsOverviewPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.sessions.title');
}
export function adminSessionsOverviewPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.sessionsOverview.description');
}

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
            label: t(locale, 'admin', 'copy.total'),
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
                        {adminSessionsOverviewPageTitle(locale)}
                    </h1>
                    <p className="text-muted-foreground">{adminSessionsOverviewPageDescription(locale)}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.sections')}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard
                                to={adminSessionsSectionTo('list')}
                                search={adminSessionsListSearch(undefined)}
                                icon={ListIcon}
                            >
                                {t(locale, 'admin', 'copy.list')}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.distribution')}</h2>
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
                        <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.creations')}</h2>
                        <DateRangePicker
                            value={pickerValue}
                            onValueChange={onRangeChange}
                            locale={DATE_FNS_LOCALE[locale]}
                            placeholder={t(locale, 'admin', 'copy.pickADateRange')}
                            className="w-auto"
                            aria-label={t(locale, 'admin', 'copy.dateRangeForSessionCreations')}
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={t(locale, 'admin', 'copy.barChartOfSessionCreationsInTheSelectedRange')}
                    />
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
