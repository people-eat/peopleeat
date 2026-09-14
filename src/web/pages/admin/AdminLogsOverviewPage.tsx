import { useNavigate } from '@tanstack/react-router';
import { FileClockIcon, ListIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type { GqlCAdminLogCriterion, GqlCAdminLogLevel, GqlCAdminLogsOverviewPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { adminLogsSectionTo } from './adminLogs';
import { adminLogLevelLabel } from './adminLogsColumns';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';

export const adminLogsOverviewPageTitle = { de: 'Log Nachrichten', en: 'Log Messages' } as const;
export const adminLogsOverviewPageDescription = {
    de: 'Verteilung und Neuanlagen der Log-Nachrichten.',
    en: 'Log message distribution and creations.',
} as const;

/** Order matches `logCounts` indices on the overview query. */
const ADMIN_LOG_COUNT_CRITERIA: GqlCAdminLogCriterion[] = [
    { levels: ['error', 'warn', 'info', 'debug'] },
    { levels: ['error'] },
    { levels: ['warn'] },
    { levels: ['info'] },
    { levels: ['debug'] },
];

export function adminLogsOverviewPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        criteria: ADMIN_LOG_COUNT_CRITERIA,
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
    };
}

function adminLogsListSearch(level: GqlCAdminLogLevel | undefined) {
    return {
        q: undefined,
        level,
        page: undefined,
        sort: undefined,
        dir: undefined,
    };
}

export function AdminLogsOverviewPage({ data, search }: { data: GqlCAdminLogsOverviewPageQuery; search: AdminOverviewRangeSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/logs' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const [total = 0, error = 0, warn = 0, info = 0, debug = 0] = admin?.logCounts ?? [];
    const buckets = admin?.logCreations ?? [];

    const distribution: {
        key: 'total' | 'error' | 'warn' | 'info' | 'debug';
        label: string;
        value: number;
        level: GqlCAdminLogLevel | undefined;
    }[] = [
        {
            key: 'total',
            label: { de: 'Gesamt', en: 'Total' }[locale],
            value: total,
            level: undefined,
        },
        {
            key: 'error',
            label: adminLogLevelLabel('error', locale),
            value: error,
            level: 'error',
        },
        {
            key: 'warn',
            label: adminLogLevelLabel('warn', locale),
            value: warn,
            level: 'warn',
        },
        {
            key: 'info',
            label: adminLogLevelLabel('info', locale),
            value: info,
            level: 'info',
        },
        {
            key: 'debug',
            label: adminLogLevelLabel('debug', locale),
            value: debug,
            level: 'debug',
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
                        <FileClockIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminLogsOverviewPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminLogsOverviewPageDescription[locale]}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Bereiche', en: 'Sections' }[locale]}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard to={adminLogsSectionTo('list')} search={adminLogsListSearch(undefined)} icon={ListIcon}>
                                {{ de: 'Liste', en: 'List' }[locale]}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Verteilung', en: 'Distribution' }[locale]}</h2>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {distribution.map((entry) => (
                            <AdminOverviewStatCard
                                key={entry.key}
                                label={entry.label}
                                value={entry.value}
                                to={adminLogsSectionTo('list')}
                                search={adminLogsListSearch(entry.level)}
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
                            aria-label={{ de: 'Zeitraum für Log-Neuanlagen', en: 'Date range for log creations' }[locale]}
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={
                            {
                                de: 'Balkendiagramm der Log-Neuanlagen im gewählten Zeitraum',
                                en: 'Bar chart of log creations in the selected range',
                            }[locale]
                        }
                    />
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
