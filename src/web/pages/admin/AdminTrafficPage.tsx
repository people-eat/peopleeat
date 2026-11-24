import { Link, useNavigate } from '@tanstack/react-router';
import { CopyIcon, MinusIcon, MoreHorizontalIcon, PlusIcon, ShareIcon, XIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import { t } from '../../../i18n/t';
import { formatDateRange, formatIsoDate } from '../../../shared';
import {
    WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX,
    webPageKeysTrafficAccount,
    webPageKeysTrafficConversion,
    webPageKeysTrafficDiscovery,
    webPageKeysTrafficLegal,
} from '../../../shared/webPage';
import type { WebPageKey } from '../../../shared/webPage';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import { DateRangePicker } from '../../components/base/date-range-picker';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Switch } from '../../components/base/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/base/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
import type { GqlCAdminTrafficPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { cn } from '../../utils/cn';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { AdminOverviewLineChart } from './AdminOverviewLineChart';
import type { AdminOverviewLineChartPoint, AdminOverviewLineChartSeries } from './AdminOverviewLineChart';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { AdminTrafficEntitySearch } from './AdminTrafficEntitySearch';
import type { AdminTrafficLink } from './adminTrafficLinks';
import {
    adminTrafficChangePercent,
    adminTrafficEntityActions,
    adminTrafficPageKeyActions,
    adminTrafficViewsPerSession,
} from './adminTrafficLinks';
import {
    adminTrafficClearCompare,
    adminTrafficPageVariables,
    adminTrafficPreviousRange,
    adminTrafficRangeLastDays,
    adminTrafficSearchResolve,
    adminTrafficSearchToUrl,
    adminTrafficToggleCompareId,
} from './adminTrafficSearch';
import type { AdminTrafficSearch } from './adminTrafficSearch';
import { adminWebPageLabel } from './adminWebPages';

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'] as const;

const CHIP_GROUPS = [
    { id: 'discovery', keys: webPageKeysTrafficDiscovery, labelKey: 'traffic.groupDiscovery' },
    { id: 'conversion', keys: webPageKeysTrafficConversion, labelKey: 'traffic.groupConversion' },
    { id: 'account', keys: webPageKeysTrafficAccount, labelKey: 'traffic.groupAccount' },
    { id: 'legal', keys: webPageKeysTrafficLegal, labelKey: 'traffic.groupLegal' },
] as const;

export function adminTrafficPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.traffic.title');
}
export function adminTrafficPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.traffic.description');
}

export { adminTrafficPageVariables };

function seriesDataKey(item: { webPageKey?: WebPageKey | null; entityId?: string | null }): string {
    return item.entityId ?? item.webPageKey ?? 'all';
}

function TrafficRowMenu({ links }: { links: AdminTrafficLink[] }) {
    const locale = useLocale();
    if (links.length === 0) return null;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label={t(locale, 'admin', 'copy.moreActions')}>
                    <MoreHorizontalIcon className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {links.map((link) => {
                    if (link.href) {
                        return (
                            <DropdownMenuItem key={link.label} asChild>
                                <a href={link.href} target="_blank" rel="noreferrer">
                                    {link.label}
                                </a>
                            </DropdownMenuItem>
                        );
                    }
                    if (link.to) {
                        return (
                            <DropdownMenuItem key={link.label} asChild>
                                <Link to={link.to as never} params={link.params as never} search={link.search as never}>
                                    {link.label}
                                </Link>
                            </DropdownMenuItem>
                        );
                    }
                    return null;
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function TrafficCompareToggle({ selected, disabled, onToggle }: { selected: boolean; disabled: boolean; onToggle: () => void }) {
    const locale = useLocale();
    const label = selected ? t(locale, 'admin', 'traffic.removeFromChart') : t(locale, 'admin', 'traffic.addToChart');
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="inline-flex">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={label}
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={onToggle}
                    >
                        {selected ? <MinusIcon className="size-4" /> : <PlusIcon className="size-4" />}
                    </Button>
                </span>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

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
        const already = resolved.keys.includes(key);
        const selected = already
            ? resolved.keys.filter((item) => item !== key)
            : [...resolved.keys, key].slice(0, WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX);
        const turningSecondSeries = !already && resolved.keys.length === 1 && selected.length === 2;
        updateSearch({
            keys: selected,
            ...adminTrafficClearCompare(),
            ...(turningSecondSeries ? { previous: false } : {}),
        });
    }

    const series = traffic?.series ?? [];
    const comparing = resolved.compareIds.length > 0;
    const priorRange = adminTrafficPreviousRange(resolved.from, resolved.to);
    const priorRangeLabel = formatDateRange(priorRange.from, priorRange.to, { locale, timeZone, dateStyle: 'short' });
    const chartSeries: AdminOverviewLineChartSeries[] = series.flatMap((item, index) => {
        const color = CHART_COLORS[index % CHART_COLORS.length]!;
        const dataKey = seriesDataKey(item);
        const current: AdminOverviewLineChartSeries = {
            dataKey,
            label: item.label,
            color,
        };
        if (!resolved.previous) return [current];
        const previous: AdminOverviewLineChartSeries = {
            dataKey: `${dataKey}__prev`,
            label: `${item.label} (${priorRangeLabel})`,
            color,
            dashed: true,
        };
        return [current, previous];
    });
    const chartData: AdminOverviewLineChartPoint[] = (series[0]?.buckets ?? []).map((bucket, index) => {
        const row: AdminOverviewLineChartPoint = { bucketStart: bucket.bucketStart };
        for (const item of series) {
            const dataKey = seriesDataKey(item);
            row[dataKey] = item.buckets[index]?.count ?? 0;
            row[`${dataKey}__prev`] = item.previousBuckets[index]?.count ?? 0;
        }
        return row;
    });

    const pageviews = traffic?.pageviews ?? 0;
    const uniqueSessions = traffic?.uniqueSessions ?? 0;
    const pageRanks = traffic?.pageRanks ?? [];
    const entityRanks = traffic?.entityRanks ?? [];
    const showEntityPending = Boolean(resolved.focusedKey) && (traffic?.untaggedDetailVisitCount ?? 0) > 0;
    const showPageRanks = !resolved.focusedKey;
    const metricValue = (row: { pageviews: number; uniqueSessions: number }) =>
        resolved.metric === 'UNIQUE_SESSIONS' ? row.uniqueSessions : row.pageviews;

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success(t(locale, 'admin', 'copy.copiedToClipboard'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotCopyToClipboard'));
        }
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="font-serif text-4xl/tight text-foreground">{adminTrafficPageTitle(locale)}</h1>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" aria-label={t(locale, 'admin', 'traffic.share')}>
                                    <ShareIcon className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => void copyLink()}>
                                    <CopyIcon />
                                    {t(locale, 'admin', 'traffic.copyLink')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <p className="text-muted-foreground">{adminTrafficPageDescription(locale)}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" size="xs" variant="outline" onClick={() => updateSearch(adminTrafficRangeLastDays(7))}>
                                {t(locale, 'admin', 'traffic.last7Days')}
                            </Button>
                            <Button type="button" size="xs" variant="outline" onClick={() => updateSearch(adminTrafficRangeLastDays(30))}>
                                {t(locale, 'admin', 'traffic.last30Days')}
                            </Button>
                            <Button type="button" size="xs" variant="outline" onClick={() => updateSearch(adminTrafficRangeLastDays(90))}>
                                {t(locale, 'admin', 'traffic.last90Days')}
                            </Button>
                            <DateRangePicker
                                value={pickerValue}
                                onValueChange={onRangeChange}
                                locale={DATE_FNS_LOCALE[locale]}
                                placeholder={t(locale, 'admin', 'copy.pickADateRange')}
                                className="w-auto"
                                aria-label={t(locale, 'admin', 'traffic.dateRange')}
                            />
                        </div>
                    </div>
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
                    {resolved.focusedKey && !comparing ? (
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

                <div className="grid gap-4">
                    {CHIP_GROUPS.map((group) => (
                        <div key={group.id} className="grid gap-2">
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t(locale, 'admin', group.labelKey)}
                            </p>
                            <div className="flex flex-wrap gap-2" role="group" aria-label={t(locale, 'admin', group.labelKey)}>
                                {group.keys.map((key) => {
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
                        </div>
                    ))}
                </div>

                {comparing ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {series.map((item) => (
                            <AdminOverviewStatCard
                                key={seriesDataKey(item)}
                                label={item.label}
                                value={metricValue(item)}
                                displayValue={`${item.pageviews} / ${item.uniqueSessions}`}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'traffic.pageviews')}
                            value={pageviews}
                            pressed={resolved.metric === 'PAGEVIEWS'}
                            onClick={() => updateSearch({ metric: 'PAGEVIEWS' })}
                        />
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'traffic.uniqueSessions')}
                            value={uniqueSessions}
                            pressed={resolved.metric === 'UNIQUE_SESSIONS'}
                            onClick={() => updateSearch({ metric: 'UNIQUE_SESSIONS' })}
                        />
                    </div>
                )}

                {pageviews === 0 && !comparing ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'traffic.noVisits')}</p>
                ) : (
                    <div className="grid gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                                {comparing
                                    ? series.map((item, index) => (
                                          <Button
                                              key={item.entityId ?? item.label}
                                              type="button"
                                              size="xs"
                                              variant="outline"
                                              className="bg-muted"
                                              onClick={() => {
                                                  if (!item.entityId) return;
                                                  updateSearch(adminTrafficToggleCompareId(resolved, item.entityId));
                                              }}
                                          >
                                              <span
                                                  className="size-2 rounded-full"
                                                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                                  aria-hidden
                                              />
                                              {item.label}
                                              <XIcon className="size-3" />
                                          </Button>
                                      ))
                                    : null}
                            </div>
                            <label className="flex shrink-0 items-center gap-2 text-sm">
                                <Switch
                                    size="sm"
                                    checked={resolved.previous}
                                    onCheckedChange={(checked) => updateSearch({ previous: checked })}
                                    aria-label={t(locale, 'admin', 'traffic.previousPeriod', { range: priorRangeLabel })}
                                />
                                <span className="text-muted-foreground">
                                    {t(locale, 'admin', 'traffic.previousPeriod', { range: priorRangeLabel })}
                                </span>
                            </label>
                        </div>
                        <AdminOverviewLineChart
                            data={chartData}
                            series={chartSeries}
                            locale={locale}
                            timeZone={timeZone}
                            ariaLabel={t(locale, 'admin', 'traffic.chart')}
                        />
                    </div>
                )}

                {showPageRanks ? (
                    <section className="grid gap-3">
                        {pageRanks.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'traffic.noVisits')}</p>
                        ) : (
                            <Table aria-label={t(locale, 'admin', 'traffic.pages')}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <span className="sr-only">{t(locale, 'admin', 'traffic.addToChart')}</span>
                                        </TableHead>
                                        <TableHead>{t(locale, 'admin', 'traffic.page')}</TableHead>
                                        <TableHead className="text-right">{t(locale, 'admin', 'traffic.pageviews')}</TableHead>
                                        <TableHead className="text-right">{t(locale, 'admin', 'traffic.uniqueSessions')}</TableHead>
                                        <TableHead className="text-right">{t(locale, 'admin', 'traffic.viewsPerSession')}</TableHead>
                                        <TableHead className="text-right">
                                            {t(locale, 'admin', 'traffic.change', { range: priorRangeLabel })}
                                        </TableHead>
                                        <TableHead className="w-10">
                                            <span className="sr-only">{t(locale, 'admin', 'copy.moreActions')}</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pageRanks.map((row) => {
                                        const selected = resolved.keys.includes(row.webPageKey);
                                        return (
                                            <TableRow
                                                key={row.webPageKey}
                                                data-state={selected ? 'selected' : undefined}
                                                className={cn(selected && 'bg-muted/40')}
                                            >
                                                <TableCell>
                                                    <TrafficCompareToggle
                                                        selected={selected}
                                                        disabled={!selected && resolved.keys.length >= WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX}
                                                        onToggle={() => toggleKey(row.webPageKey)}
                                                    />
                                                </TableCell>
                                                <TableCell>{adminWebPageLabel(row.webPageKey, locale)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{row.pageviews}</TableCell>
                                                <TableCell className="text-right tabular-nums">{row.uniqueSessions}</TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {adminTrafficViewsPerSession(row.pageviews, row.uniqueSessions)}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {adminTrafficChangePercent(
                                                        metricValue(row),
                                                        resolved.metric === 'UNIQUE_SESSIONS'
                                                            ? row.previousUniqueSessions
                                                            : row.previousPageviews,
                                                        locale,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <TrafficRowMenu links={adminTrafficPageKeyActions(locale, row.webPageKey, resolved)} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </section>
                ) : null}

                {resolved.focusedKey ? (
                    <section className="grid gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="font-serif text-2xl text-foreground">{adminWebPageLabel(resolved.focusedKey, locale)}</h2>
                            <AdminTrafficEntitySearch
                                focusedKey={resolved.focusedKey}
                                resolved={resolved}
                                onSelect={(id) => updateSearch(adminTrafficToggleCompareId(resolved, id))}
                            />
                        </div>
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
                                        <TableHead className="w-10">
                                            <span className="sr-only">{t(locale, 'admin', 'traffic.addToChart')}</span>
                                        </TableHead>
                                        <TableHead>{t(locale, 'admin', 'traffic.entity')}</TableHead>
                                        <TableHead className="text-right">{t(locale, 'admin', 'traffic.pageviews')}</TableHead>
                                        <TableHead className="text-right">{t(locale, 'admin', 'traffic.uniqueSessions')}</TableHead>
                                        <TableHead className="text-right">{t(locale, 'admin', 'traffic.viewsPerSession')}</TableHead>
                                        <TableHead className="text-right">
                                            {t(locale, 'admin', 'traffic.change', { range: priorRangeLabel })}
                                        </TableHead>
                                        <TableHead className="w-10">
                                            <span className="sr-only">{t(locale, 'admin', 'copy.moreActions')}</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entityRanks.map((row) => {
                                        const selected = resolved.compareIds.includes(row.id);
                                        return (
                                            <TableRow
                                                key={row.id}
                                                data-state={selected ? 'selected' : undefined}
                                                className={cn(selected && 'bg-muted/40')}
                                            >
                                                <TableCell>
                                                    <TrafficCompareToggle
                                                        selected={selected}
                                                        disabled={
                                                            !selected && resolved.compareIds.length >= WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX
                                                        }
                                                        onToggle={() => updateSearch(adminTrafficToggleCompareId(resolved, row.id))}
                                                    />
                                                </TableCell>
                                                <TableCell>{row.label}</TableCell>
                                                <TableCell className="text-right tabular-nums">{row.pageviews}</TableCell>
                                                <TableCell className="text-right tabular-nums">{row.uniqueSessions}</TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {adminTrafficViewsPerSession(row.pageviews, row.uniqueSessions)}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {adminTrafficChangePercent(
                                                        metricValue(row),
                                                        resolved.metric === 'UNIQUE_SESSIONS'
                                                            ? row.previousUniqueSessions
                                                            : row.previousPageviews,
                                                        locale,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <TrafficRowMenu links={adminTrafficEntityActions(locale, resolved.focusedKey!, row)} />
                                                </TableCell>
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
