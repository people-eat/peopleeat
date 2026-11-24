import { useNavigate } from '@tanstack/react-router';
import type { DateRange } from 'react-day-picker';

import { t } from '../../../i18n/t';
import { formatIsoDate } from '../../../shared';
import { WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX, webPageKeysTracked } from '../../../shared/webPage';
import type { WebPageKey } from '../../../shared/webPage';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import { DateRangePicker } from '../../components/base/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/base/table';
import type { GqlCAdminTrafficPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { AdminOverviewLineChart } from './AdminOverviewLineChart';
import type { AdminOverviewLineChartPoint } from './AdminOverviewLineChart';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { adminTrafficPageVariables, adminTrafficSearchResolve, adminTrafficSearchToUrl } from './adminTrafficSearch';
import type { AdminTrafficSearch } from './adminTrafficSearch';
import { adminWebPageLabel } from './adminWebPages';

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'] as const;

export function adminTrafficPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.traffic.title');
}
export function adminTrafficPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.traffic.description');
}

export { adminTrafficPageVariables };

export function AdminTrafficPage({ data, search }: { data: GqlCAdminTrafficPageQuery; search: AdminTrafficSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/traffic' });
    const resolved = adminTrafficSearchResolve(search);
    const traffic = data.currentSession.user?.admin?.webPageVisitTraffic;

    function updateSearch(next: Partial<ReturnType<typeof adminTrafficSearchResolve>>) {
        void navigate({
            search: adminTrafficSearchToUrl({ ...resolved, ...next }),
        });
    }

    const pickerValue: DateRange = {
        from: new Date(`${resolved.from}T00:00:00`),
        to: new Date(`${resolved.to}T00:00:00`),
    };

    function onRangeChange(next: DateRange | undefined) {
        if (!next?.from || !next.to) return;
        updateSearch({ from: formatIsoDate(next.from), to: formatIsoDate(next.to) });
    }

    function toggleKey(key: WebPageKey) {
        const selected = resolved.keys.includes(key)
            ? resolved.keys.filter((item) => item !== key)
            : [...resolved.keys, key].slice(0, WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX);
        updateSearch({
            keys: selected,
            cookId: undefined,
            cityId: undefined,
            partnerVenueId: undefined,
            occasionId: undefined,
            blogPostId: undefined,
        });
    }

    const series = traffic?.series ?? [];
    const chartSeries = series.map((item, index) => ({
        dataKey: item.webPageKey ?? 'all',
        label: item.webPageKey ? adminWebPageLabel(item.webPageKey, locale) : t(locale, 'admin', 'traffic.allPages'),
        color: CHART_COLORS[index % CHART_COLORS.length]!,
    }));
    const chartData: AdminOverviewLineChartPoint[] = (series[0]?.buckets ?? []).map((bucket, index) => {
        const row: AdminOverviewLineChartPoint = { bucketStart: bucket.bucketStart };
        for (const item of series) {
            row[item.webPageKey ?? 'all'] = item.buckets[index]?.count ?? 0;
        }
        return row;
    });

    const pageviews = traffic?.pageviews ?? 0;
    const uniqueSessions = traffic?.uniqueSessions ?? 0;
    const pageRanks = traffic?.pageRanks ?? [];
    const entityRanks = traffic?.entityRanks ?? [];
    const selectedEntityId = resolved.cookId ?? resolved.cityId ?? resolved.partnerVenueId ?? resolved.occasionId ?? resolved.blogPostId;
    const showEntityPending = Boolean(resolved.focusedKey) && (traffic?.untaggedDetailVisitCount ?? 0) > 0;

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="grid gap-2">
                        <h1 className="font-serif text-4xl/tight text-foreground">{adminTrafficPageTitle(locale)}</h1>
                        <p className="text-muted-foreground">{adminTrafficPageDescription(locale)}</p>
                    </div>
                    <DateRangePicker
                        value={pickerValue}
                        onValueChange={onRangeChange}
                        locale={DATE_FNS_LOCALE[locale]}
                        placeholder={t(locale, 'admin', 'copy.pickADateRange')}
                        className="w-auto"
                        aria-label={t(locale, 'admin', 'traffic.dateRange')}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex shrink-0 items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{t(locale, 'admin', 'traffic.granularity')}</span>
                        <Select
                            value={resolved.granularity}
                            onValueChange={(value) => updateSearch({ granularity: value as typeof resolved.granularity })}
                        >
                            <SelectTrigger size="sm" className="w-auto" aria-label={t(locale, 'admin', 'traffic.granularity')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day">{t(locale, 'admin', 'traffic.granularityDay')}</SelectItem>
                                <SelectItem value="week">{t(locale, 'admin', 'traffic.granularityWeek')}</SelectItem>
                                <SelectItem value="month">{t(locale, 'admin', 'traffic.granularityMonth')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </label>
                    <label className="flex shrink-0 items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{t(locale, 'admin', 'traffic.audience')}</span>
                        <Select
                            value={resolved.audience}
                            onValueChange={(value) => updateSearch({ audience: value as typeof resolved.audience })}
                        >
                            <SelectTrigger size="sm" className="w-auto" aria-label={t(locale, 'admin', 'traffic.audience')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="HUMAN">{t(locale, 'admin', 'traffic.audienceHuman')}</SelectItem>
                                <SelectItem value="ALL">{t(locale, 'admin', 'traffic.audienceAll')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </label>
                    <label className="flex shrink-0 items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{t(locale, 'admin', 'traffic.metric')}</span>
                        <Select
                            value={resolved.metric}
                            onValueChange={(value) => updateSearch({ metric: value as typeof resolved.metric })}
                        >
                            <SelectTrigger size="sm" className="w-auto" aria-label={t(locale, 'admin', 'traffic.metric')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PAGEVIEWS">{t(locale, 'admin', 'traffic.metricPageviews')}</SelectItem>
                                <SelectItem value="UNIQUE_SESSIONS">{t(locale, 'admin', 'traffic.metricUniqueSessions')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </label>
                    {resolved.focusedKey ? (
                        <label className="flex shrink-0 items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{t(locale, 'admin', 'traffic.scope')}</span>
                            <Select
                                value={resolved.scope}
                                onValueChange={(value) => updateSearch({ scope: value as typeof resolved.scope })}
                            >
                                <SelectTrigger size="sm" className="w-auto" aria-label={t(locale, 'admin', 'traffic.scope')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">{t(locale, 'admin', 'traffic.scopeAll')}</SelectItem>
                                    <SelectItem value="INDEX">{t(locale, 'admin', 'traffic.scopeIndex')}</SelectItem>
                                    <SelectItem value="DETAIL">{t(locale, 'admin', 'traffic.scopeDetail')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </label>
                    ) : null}
                </div>

                <div className="flex flex-wrap gap-2" role="group" aria-label={t(locale, 'admin', 'traffic.pages')}>
                    {webPageKeysTracked.map((key) => {
                        const selected = resolved.keys.includes(key);
                        const disabled = !selected && resolved.keys.length >= WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX;
                        return (
                            <Button
                                key={key}
                                type="button"
                                size="xs"
                                variant={selected ? 'default' : 'outline'}
                                disabled={disabled}
                                aria-pressed={selected}
                                onClick={() => toggleKey(key)}
                            >
                                {adminWebPageLabel(key, locale)}
                            </Button>
                        );
                    })}
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                    <AdminOverviewStatCard label={t(locale, 'admin', 'traffic.pageviews')} value={pageviews} />
                    <AdminOverviewStatCard label={t(locale, 'admin', 'traffic.uniqueSessions')} value={uniqueSessions} />
                </dl>

                {pageviews === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'traffic.noVisits')}</p>
                ) : (
                    <AdminOverviewLineChart
                        data={chartData}
                        series={chartSeries}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={t(locale, 'admin', 'traffic.chart')}
                    />
                )}

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'traffic.pages')}</h2>
                    {pageRanks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'traffic.noVisits')}</p>
                    ) : (
                        <Table aria-label={t(locale, 'admin', 'traffic.pages')}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t(locale, 'admin', 'traffic.page')}</TableHead>
                                    <TableHead className="text-right">{t(locale, 'admin', 'traffic.pageviews')}</TableHead>
                                    <TableHead className="text-right">{t(locale, 'admin', 'traffic.uniqueSessions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pageRanks.map((row) => {
                                    const selected = resolved.keys.includes(row.webPageKey);
                                    return (
                                        <TableRow key={row.webPageKey}>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    className="h-auto px-0"
                                                    aria-pressed={selected}
                                                    onClick={() => toggleKey(row.webPageKey)}
                                                >
                                                    {adminWebPageLabel(row.webPageKey, locale)}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{row.pageviews}</TableCell>
                                            <TableCell className="text-right tabular-nums">{row.uniqueSessions}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </section>

                {resolved.focusedKey ? (
                    <section className="grid gap-3">
                        <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'traffic.entities')}</h2>
                        {showEntityPending ? (
                            <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'traffic.entityBreakdownPending')}</p>
                        ) : null}
                        {entityRanks.length === 0 && !showEntityPending ? (
                            <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'traffic.noEntityVisits')}</p>
                        ) : null}
                        {entityRanks.length > 0 ? (
                            <Table aria-label={t(locale, 'admin', 'traffic.entities')}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t(locale, 'admin', 'traffic.entity')}</TableHead>
                                        <TableHead className="text-right">{t(locale, 'admin', 'traffic.pageviews')}</TableHead>
                                        <TableHead className="text-right">{t(locale, 'admin', 'traffic.uniqueSessions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entityRanks.map((row) => {
                                        const selected = selectedEntityId === row.id;
                                        return (
                                            <TableRow key={row.id}>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="link"
                                                        className="h-auto px-0"
                                                        aria-pressed={selected}
                                                        onClick={() => {
                                                            const nextId = selected ? undefined : row.id;
                                                            updateSearch({
                                                                cookId: resolved.focusedKey === 'CHEFS' ? nextId : undefined,
                                                                cityId: resolved.focusedKey === 'CITIES' ? nextId : undefined,
                                                                partnerVenueId: resolved.focusedKey === 'VENUES' ? nextId : undefined,
                                                                occasionId: resolved.focusedKey === 'OCCASIONS' ? nextId : undefined,
                                                                blogPostId: resolved.focusedKey === 'BLOG_POSTS' ? nextId : undefined,
                                                            });
                                                        }}
                                                    >
                                                        {row.label}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{row.pageviews}</TableCell>
                                                <TableCell className="text-right tabular-nums">{row.uniqueSessions}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : null}
                    </section>
                ) : null}
            </main>
        </AdminPathPageChrome>
    );
}
