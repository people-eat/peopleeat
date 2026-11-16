import { useNavigate } from '@tanstack/react-router';
import { ListIcon, SparklesIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { t } from '../../../i18n/t';
import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type {
    GqlCAdminAiGenerationCriterion,
    GqlCAdminAiGenerationKind,
    GqlCAdminAiGenerationsOverviewPageQuery,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { adminAiGenerationsSectionTo } from './adminAiGenerations';
import { ADMIN_AI_GENERATION_KINDS, adminAiGenerationKindLabel } from './adminAiGenerationsColumns';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';

export function adminAiGenerationsOverviewPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.aiGenerations.title');
}
export function adminAiGenerationsOverviewPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.aiGenerationsOverview.description');
}

/** Order matches `aiGenerationCounts` indices on the overview query. */
const ADMIN_AI_GENERATION_COUNT_CRITERIA: GqlCAdminAiGenerationCriterion[] = [
    { kinds: [...ADMIN_AI_GENERATION_KINDS] },
    ...ADMIN_AI_GENERATION_KINDS.map((kind) => ({ kinds: [kind] })),
];

export function adminAiGenerationsOverviewPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        criteria: ADMIN_AI_GENERATION_COUNT_CRITERIA,
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
    };
}

function adminAiGenerationsListSearch(kind: GqlCAdminAiGenerationKind | undefined) {
    return {
        q: undefined,
        kind,
        page: undefined,
        sort: undefined,
        dir: undefined,
    };
}

export function AdminAiGenerationsOverviewPage({
    data,
    search,
}: {
    data: GqlCAdminAiGenerationsOverviewPageQuery;
    search: AdminOverviewRangeSearch;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/ai-generations' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const counts = admin?.aiGenerationCounts ?? [];
    const total = counts[0] ?? 0;
    const buckets = admin?.aiGenerationCreations ?? [];

    const distribution: {
        key: string;
        label: string;
        value: number;
        kind: GqlCAdminAiGenerationKind | undefined;
    }[] = [
        {
            key: 'total',
            label: t(locale, 'admin', 'copy.total'),
            value: total,
            kind: undefined,
        },
        ...ADMIN_AI_GENERATION_KINDS.map((kind, index) => ({
            key: kind,
            label: adminAiGenerationKindLabel(kind, locale),
            value: counts[index + 1] ?? 0,
            kind,
        })),
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
                        <SparklesIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminAiGenerationsOverviewPageTitle(locale)}
                    </h1>
                    <p className="text-muted-foreground">{adminAiGenerationsOverviewPageDescription(locale)}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.sections')}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard
                                to={adminAiGenerationsSectionTo('list')}
                                search={adminAiGenerationsListSearch(undefined)}
                                icon={ListIcon}
                            >
                                {t(locale, 'admin', 'copy.list')}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.distribution')}</h2>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {distribution.map((entry) => (
                            <AdminOverviewStatCard
                                key={entry.key}
                                label={entry.label}
                                value={entry.value}
                                to={adminAiGenerationsSectionTo('list')}
                                search={adminAiGenerationsListSearch(entry.kind)}
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
                            aria-label={t(locale, 'admin', 'copy.dateRangeForAiGenerations')}
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={t(locale, 'admin', 'copy.barChartOfAiGenerationsInTheSelectedRange')}
                    />
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
