import { CircleHelpIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Layer,
    Tooltip as RechartsTooltip,
    Rectangle,
    ResponsiveContainer,
    Sankey,
    useChartWidth,
    XAxis,
    YAxis,
} from 'recharts';

import { t } from '../../../i18n/t';
import { formatCurrency, formatDate } from '../../../shared';
import type { CookAnalyticsChannel } from '../../../shared';
import { Button } from '../../components/base/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/base/chart';
import type { ChartConfig } from '../../components/base/chart';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
import { Reveal } from '../../components/Reveal';
import type {
    GqlCProfileCookAnalyticsFragment,
    GqlCProfileCookAnalyticsFunnelFragment,
    GqlCProfileCookAnalyticsOfferCreateStageFragment,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { cn } from '../../utils/cn';
import { cookAnalyticsFormatDurationMinutes, cookAnalyticsFormatPercent } from './cookAnalyticsFormat';

function MetricHelp({ label, body }: { label: string; body: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-xs" className="size-5 text-muted-foreground" aria-label={label}>
                    <CircleHelpIcon className="size-3.5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64 text-left text-xs/snug text-balance">
                {body}
            </TooltipContent>
        </Tooltip>
    );
}

function SectionHeading({
    id,
    title,
    description,
    help,
}: {
    id: string;
    title: string;
    description?: string;
    help?: { label: string; body: string };
}) {
    return (
        <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
                <h2 id={id} className="text-sm font-medium text-foreground">
                    {title}
                </h2>
                {help ? <MetricHelp label={help.label} body={help.body} /> : null}
            </div>
            {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
    );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('rounded-xl border border-border/70 bg-secondary/80 p-4 sm:p-5', className)}>{children}</div>;
}

function LowVolumeNote({ count }: { count: number }) {
    const locale = useLocale();
    if (count <= 0 || count > 5) return null;
    return <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'analytics.lowVolume', { count })}</p>;
}

function stageLabel(stageId: string, locale: ReturnType<typeof useLocale>): string {
    switch (stageId) {
        case 'requested_you':
            return t(locale, 'profileCook', 'analytics.stages.requestedYou');
        case 'in_pool':
            return t(locale, 'profileCook', 'analytics.stages.inPool');
        case 'opened':
            return t(locale, 'profileCook', 'analytics.stages.opened');
        case 'declined':
            return t(locale, 'profileCook', 'analytics.stages.declined');
        case 'offer_sent':
            return t(locale, 'profileCook', 'analytics.stages.offerSent');
        case 'both_accepted':
            return t(locale, 'profileCook', 'analytics.stages.bothAccepted');
        case 'paid':
            return t(locale, 'profileCook', 'analytics.stages.paid');
        case 'offer_create':
            return t(locale, 'profileCook', 'analytics.offerCreateStages.offerCreate');
        case 'menus':
            return t(locale, 'profileCook', 'analytics.offerCreateStages.menus');
        case 'price':
            return t(locale, 'profileCook', 'analytics.offerCreateStages.price');
        case 'message':
            return t(locale, 'profileCook', 'analytics.offerCreateStages.message');
        case 'created':
            return t(locale, 'profileCook', 'analytics.offerCreateStages.created');
        default:
            return stageId;
    }
}

function insightLines(analytics: GqlCProfileCookAnalyticsFragment, locale: ReturnType<typeof useLocale>): string[] {
    const lines: string[] = [];
    const direct = analytics.funnels.find((funnel) => funnel.channel === 'DIRECT');
    const pool = analytics.funnels.find((funnel) => funnel.channel === 'POOL');
    const directOpened = direct?.stages.find((stage) => stage.id === 'opened')?.count ?? 0;
    const directOffers = direct?.stages.find((stage) => stage.id === 'offer_sent')?.count ?? 0;
    const poolOpened = pool?.stages.find((stage) => stage.id === 'opened')?.count ?? 0;
    const poolOffers = pool?.stages.find((stage) => stage.id === 'offer_sent')?.count ?? 0;

    if ((direct?.entryCount ?? 0) > 0 && directOpened > 0 && directOffers === 0) {
        lines.push(t(locale, 'profileCook', 'analytics.insights.directOpenedNoOffer'));
    }
    if (analytics.openRate != null && analytics.openRate < 0.5 && analytics.requestsNotifiedCount >= 5) {
        lines.push(t(locale, 'profileCook', 'analytics.insights.lowOpenRate'));
    }
    if (analytics.offerCreateRate != null && analytics.offerCreateRate >= 0.7 && analytics.requestsOpenedCount >= 5) {
        lines.push(t(locale, 'profileCook', 'analytics.insights.strongOfferRate'));
    }
    if (poolOpened > 0 && poolOffers > 0 && poolOffers / poolOpened >= 0.75) {
        lines.push(t(locale, 'profileCook', 'analytics.insights.poolOfferFollowThrough'));
    }
    if (analytics.offersCreatedCount > 0 && analytics.offerConversionRate != null && analytics.offerConversionRate < 0.25) {
        lines.push(t(locale, 'profileCook', 'analytics.insights.lowConversion'));
    }
    return lines.slice(0, 2);
}

export function CookAnalyticsInsights({ analytics }: { analytics: GqlCProfileCookAnalyticsFragment }) {
    const locale = useLocale();
    const lines = insightLines(analytics, locale);
    if (lines.length === 0) return null;

    return (
        <Reveal as="section" className="grid gap-2" aria-label={t(locale, 'profileCook', 'analytics.insights.label')}>
            {lines.map((line) => (
                <div key={line} className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
                    {line}
                </div>
            ))}
        </Reveal>
    );
}

export function CookAnalyticsHero({ analytics }: { analytics: GqlCProfileCookAnalyticsFragment }) {
    const locale = useLocale();
    const entryCount = analytics.funnels.reduce((sum, funnel) => sum + funnel.entryCount, 0);
    const conversionPercent = analytics.offerConversionRate == null ? null : Math.round(analytics.offerConversionRate * 100);

    return (
        <Reveal as="section" className="grid gap-4" aria-labelledby="cook-analytics-hero">
            <SectionHeading
                id="cook-analytics-hero"
                title={t(locale, 'profileCook', 'analytics.heroTitle')}
                description={t(locale, 'profileCook', 'analytics.heroDescription')}
                help={{
                    label: t(locale, 'profileCook', 'analytics.help.heroLabel'),
                    body: t(locale, 'profileCook', 'analytics.help.heroBody'),
                }}
            />
            <LowVolumeNote count={entryCount} />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Panel className="relative overflow-hidden border-l-4 border-l-accent">
                    <div className="grid gap-2">
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t(locale, 'profileCook', 'analytics.payoutTotal')}
                            </p>
                            <MetricHelp
                                label={t(locale, 'profileCook', 'analytics.help.payoutLabel')}
                                body={t(locale, 'profileCook', 'analytics.help.payoutBody')}
                            />
                        </div>
                        <p className="font-serif text-5xl/tight tabular-nums text-foreground">
                            {formatCurrency(analytics.paidPayoutCentsCookTotal, { locale, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'profileCook', 'analytics.heroOffersCreated', { count: analytics.offersCreatedCount })}
                        </p>
                    </div>
                </Panel>
                <Panel>
                    <div className="grid gap-2">
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t(locale, 'profileCook', 'analytics.paid')}
                            </p>
                            <MetricHelp
                                label={t(locale, 'profileCook', 'analytics.help.paidLabel')}
                                body={t(locale, 'profileCook', 'analytics.help.paidBody')}
                            />
                        </div>
                        <p className="font-serif text-4xl/tight tabular-nums text-foreground">{analytics.offersPaidCount}</p>
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'profileCook', 'analytics.heroAccepted', { count: analytics.offersAcceptedCount })}
                        </p>
                    </div>
                </Panel>
                <Panel>
                    <div className="grid gap-3">
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t(locale, 'profileCook', 'analytics.conversion')}
                            </p>
                            <MetricHelp
                                label={t(locale, 'profileCook', 'analytics.help.conversionLabel')}
                                body={t(locale, 'profileCook', 'analytics.help.conversionBody')}
                            />
                        </div>
                        <p className="font-serif text-4xl/tight tabular-nums text-foreground">
                            {cookAnalyticsFormatPercent(analytics.offerConversionRate, locale)}
                        </p>
                        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                            <div
                                className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out motion-reduce:transition-none"
                                style={{ width: `${conversionPercent ?? 0}%` }}
                            />
                        </div>
                    </div>
                </Panel>
            </div>
        </Reveal>
    );
}

function FunnelSankeyNode({
    x,
    y,
    width,
    height,
    index,
    payload,
}: {
    x: number;
    y: number;
    width: number;
    height: number;
    index: number;
    payload: { name?: string };
}) {
    const chartWidth = useChartWidth();
    if (chartWidth == null) return null;
    const label = payload.name ?? '';
    const labelOnLeft = x + width + 6 > chartWidth;
    return (
        <Layer key={`cook-sankey-node-${index}`}>
            <Rectangle x={x} y={y} width={width} height={height} fill="var(--foreground)" fillOpacity={0.85} />
            {label ? (
                <text
                    x={labelOnLeft ? x - 6 : x + width + 6}
                    y={y + height / 2}
                    textAnchor={labelOnLeft ? 'end' : 'start'}
                    dominantBaseline="middle"
                    className="fill-foreground text-xs"
                >
                    {label}
                </text>
            ) : null}
        </Layer>
    );
}

function sankeyFromFunnel(funnel: GqlCProfileCookAnalyticsFunnelFragment, locale: ReturnType<typeof useLocale>) {
    const byId = new Map(funnel.stages.map((stage) => [stage.id, stage.count]));
    const entryId = funnel.channel === 'DIRECT' ? 'requested_you' : 'in_pool';
    const nodes = funnel.stages
        .filter((stage) => stage.id !== 'declined' || (byId.get('declined') ?? 0) > 0)
        .map((stage) => ({ id: stage.id, name: stageLabel(stage.id, locale) }));
    const indexById = new Map(nodes.map((node, index) => [node.id, index]));
    const links: Array<{ source: number; target: number; value: number }> = [];

    function pushLink(sourceId: string, targetId: string, value: number) {
        const source = indexById.get(sourceId);
        const target = indexById.get(targetId);
        if (source == null || target == null || value <= 0) return;
        links.push({ source, target, value });
    }

    pushLink(entryId, 'opened', byId.get('opened') ?? 0);
    if (funnel.channel === 'POOL') {
        pushLink('opened', 'declined', byId.get('declined') ?? 0);
    }
    pushLink('opened', 'offer_sent', byId.get('offer_sent') ?? 0);
    pushLink('offer_sent', 'both_accepted', byId.get('both_accepted') ?? 0);
    pushLink('both_accepted', 'paid', byId.get('paid') ?? 0);

    if (links.length === 0) return null;
    return { nodes, links };
}

function CookAnalyticsSteppedFunnel({ funnel, title }: { funnel: GqlCProfileCookAnalyticsFunnelFragment; title: string }) {
    const locale = useLocale();
    const chartData = funnel.stages.map((stage) => ({
        id: stage.id,
        label: stageLabel(stage.id, locale),
        count: stage.count,
        stepRate: stage.stepRate,
        fill: stage.id === 'declined' ? 'var(--color-declined)' : 'var(--color-count)',
    }));
    const chartConfig = {
        count: { label: t(locale, 'profileCook', 'analytics.chart.count'), color: 'var(--foreground)' },
        declined: { label: t(locale, 'profileCook', 'analytics.stages.declined'), color: 'var(--destructive)' },
    } satisfies ChartConfig;
    const sankeyData = funnel.entryCount >= 5 ? sankeyFromFunnel(funnel, locale) : null;
    const paidCount = funnel.stages.find((stage) => stage.id === 'paid')?.count ?? 0;
    const entryToPaid = funnel.entryCount > 0 ? paidCount / funnel.entryCount : null;

    return (
        <Panel className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                    <h3 className="text-sm font-medium text-foreground">{title}</h3>
                    {funnel.entryCount === 0 ? (
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'analytics.funnelEmptyPeriod')}</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'profileCook', 'analytics.funnelEntryToPaid', {
                                entry: funnel.entryCount,
                                paid: paidCount,
                                rate: cookAnalyticsFormatPercent(entryToPaid, locale),
                            })}
                        </p>
                    )}
                    <LowVolumeNote count={funnel.entryCount} />
                </div>
            </div>

            {funnel.entryCount > 0 ? (
                <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full" aria-label={title}>
                    <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="label"
                            type="category"
                            width={110}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className="text-xs"
                        />
                        <ChartTooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                            content={
                                <ChartTooltipContent
                                    formatter={(value, _name, item) => {
                                        const rate = item?.payload?.stepRate as number | null | undefined;
                                        const countLabel = String(value ?? 0);
                                        if (rate == null) return countLabel;
                                        return `${countLabel} · ${cookAnalyticsFormatPercent(rate, locale)}`;
                                    }}
                                />
                            }
                        />
                        <Bar dataKey="count" radius={4}>
                            {chartData.map((entry) => (
                                <Cell key={entry.id} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            ) : null}

            {sankeyData ? (
                <div className="grid gap-2">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'profileCook', 'analytics.funnelFlowTitle')}
                    </p>
                    <div className="h-56 w-full" aria-label={t(locale, 'profileCook', 'analytics.funnelFlowTitle')}>
                        <ResponsiveContainer width="100%" height="100%">
                            <Sankey
                                data={sankeyData}
                                nodeWidth={12}
                                nodePadding={28}
                                margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                                link={{ stroke: 'var(--foreground)', strokeOpacity: 0.18 }}
                                node={FunnelSankeyNode}
                            >
                                <RechartsTooltip />
                            </Sankey>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : null}
        </Panel>
    );
}

export function CookAnalyticsFunnelPair({
    funnels,
    channel,
}: {
    funnels: GqlCProfileCookAnalyticsFunnelFragment[];
    channel: CookAnalyticsChannel;
}) {
    const locale = useLocale();

    return (
        <Reveal as="section" index={1} className="grid gap-4" aria-labelledby="cook-analytics-funnels">
            <SectionHeading
                id="cook-analytics-funnels"
                title={t(locale, 'profileCook', 'analytics.funnelTitle')}
                description={t(locale, 'profileCook', 'analytics.funnelDescription')}
                help={{
                    label: t(locale, 'profileCook', 'analytics.help.funnelLabel'),
                    body: t(locale, 'profileCook', 'analytics.help.funnelBody'),
                }}
            />
            <div className={cn('grid gap-4', channel === 'ALL' ? 'xl:grid-cols-2' : undefined)}>
                {funnels.map((funnel) => (
                    <CookAnalyticsSteppedFunnel
                        key={funnel.channel}
                        funnel={funnel}
                        title={
                            funnel.channel === 'DIRECT'
                                ? t(locale, 'profileCook', 'analytics.funnel.directTitle')
                                : t(locale, 'profileCook', 'analytics.funnel.poolTitle')
                        }
                    />
                ))}
            </div>
        </Reveal>
    );
}

function RateMeter({
    label,
    help,
    valueLabel,
    rate,
}: {
    label: string;
    help: { label: string; body: string };
    valueLabel: string;
    rate: number | null;
}) {
    const width = rate == null ? 0 : Math.max(0, Math.min(100, Math.round(rate * 100)));
    return (
        <div className="grid gap-2 rounded-lg border border-border/60 bg-background/70 p-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1">
                    <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
                    <MetricHelp label={help.label} body={help.body} />
                </div>
                <p className="shrink-0 font-serif text-xl/tight tabular-nums text-foreground">{valueLabel}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                    className="h-full rounded-full bg-foreground/80 transition-[width] duration-300 ease-out motion-reduce:transition-none"
                    style={{ width: `${width}%` }}
                />
            </div>
        </div>
    );
}

export function CookAnalyticsRateStrip({ analytics }: { analytics: GqlCProfileCookAnalyticsFragment }) {
    const locale = useLocale();

    return (
        <Reveal as="section" index={2} className="grid gap-4" aria-labelledby="cook-analytics-rates">
            <SectionHeading
                id="cook-analytics-rates"
                title={t(locale, 'profileCook', 'analytics.ratesTitle')}
                description={t(locale, 'profileCook', 'analytics.ratesDescription')}
                help={{
                    label: t(locale, 'profileCook', 'analytics.help.ratesLabel'),
                    body: t(locale, 'profileCook', 'analytics.help.ratesBody'),
                }}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <RateMeter
                    label={t(locale, 'profileCook', 'analytics.openRate')}
                    help={{
                        label: t(locale, 'profileCook', 'analytics.help.openRateLabel'),
                        body: t(locale, 'profileCook', 'analytics.help.openRateBody'),
                    }}
                    valueLabel={cookAnalyticsFormatPercent(analytics.openRate, locale)}
                    rate={analytics.openRate}
                />
                <RateMeter
                    label={t(locale, 'profileCook', 'analytics.declineRate')}
                    help={{
                        label: t(locale, 'profileCook', 'analytics.help.declineRateLabel'),
                        body: t(locale, 'profileCook', 'analytics.help.declineRateBody'),
                    }}
                    valueLabel={cookAnalyticsFormatPercent(analytics.declineRate, locale)}
                    rate={analytics.declineRate}
                />
                <RateMeter
                    label={t(locale, 'profileCook', 'analytics.offerCreateRate')}
                    help={{
                        label: t(locale, 'profileCook', 'analytics.help.offerCreateRateLabel'),
                        body: t(locale, 'profileCook', 'analytics.help.offerCreateRateBody'),
                    }}
                    valueLabel={cookAnalyticsFormatPercent(analytics.offerCreateRate, locale)}
                    rate={analytics.offerCreateRate}
                />
                <Panel className="sm:col-span-2 lg:col-span-3">
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1">
                            <dt className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t(locale, 'profileCook', 'analytics.timeToOpen')}
                                <MetricHelp
                                    label={t(locale, 'profileCook', 'analytics.help.timeToOpenLabel')}
                                    body={t(locale, 'profileCook', 'analytics.help.timeToOpenBody')}
                                />
                            </dt>
                            <dd className="font-serif text-2xl/tight tabular-nums text-foreground">
                                {cookAnalyticsFormatDurationMinutes(analytics.medianNotifyToOpenMinutes, locale)}
                            </dd>
                        </div>
                        <div className="grid gap-1">
                            <dt className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t(locale, 'profileCook', 'analytics.timeToOffer')}
                                <MetricHelp
                                    label={t(locale, 'profileCook', 'analytics.help.timeToOfferLabel')}
                                    body={t(locale, 'profileCook', 'analytics.help.timeToOfferBody')}
                                />
                            </dt>
                            <dd className="font-serif text-2xl/tight tabular-nums text-foreground">
                                {cookAnalyticsFormatDurationMinutes(analytics.medianNotifyToOfferMinutes, locale)}
                            </dd>
                        </div>
                    </dl>
                </Panel>
            </div>
        </Reveal>
    );
}

export function CookAnalyticsTrend({ analytics }: { analytics: GqlCProfileCookAnalyticsFragment }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const hasSignal = analytics.trend.some(
        (point) => point.publicProfileViewCount > 0 || point.offersCreatedCount > 0 || point.offersPaidCount > 0,
    );
    const chartConfig = {
        publicProfileViewCount: {
            label: t(locale, 'profileCook', 'analytics.profileViews'),
            color: 'var(--muted-foreground)',
        },
        offersCreatedCount: {
            label: t(locale, 'profileCook', 'analytics.offersCreated'),
            color: 'var(--foreground)',
        },
        offersPaidCount: {
            label: t(locale, 'profileCook', 'analytics.paid'),
            color: 'var(--accent)',
        },
    } satisfies ChartConfig;

    const chartData = analytics.trend.map((point) => ({
        ...point,
        label: formatDate(point.bucketStart, { locale, timeZone, dateStyle: 'short' }),
    }));

    return (
        <Reveal as="section" index={3} className="grid gap-4" aria-labelledby="cook-analytics-trend">
            <SectionHeading
                id="cook-analytics-trend"
                title={t(locale, 'profileCook', 'analytics.trendTitle')}
                description={t(locale, 'profileCook', 'analytics.trendDescription')}
                help={{
                    label: t(locale, 'profileCook', 'analytics.help.trendLabel'),
                    body: t(locale, 'profileCook', 'analytics.help.trendBody'),
                }}
            />
            <Panel>
                {!hasSignal ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'analytics.trendEmpty')}</p>
                ) : (
                    <ChartContainer
                        config={chartConfig}
                        className="aspect-auto h-64 w-full"
                        aria-label={t(locale, 'profileCook', 'analytics.trendTitle')}
                    >
                        <BarChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(_, payload) => {
                                            const bucketStart = payload[0]?.payload?.bucketStart as string | Date | undefined;
                                            return bucketStart ? formatDate(bucketStart, { locale, timeZone, dateStyle: 'medium' }) : '';
                                        }}
                                    />
                                }
                            />
                            <Bar dataKey="publicProfileViewCount" fill="var(--color-publicProfileViewCount)" radius={2} />
                            <Bar dataKey="offersCreatedCount" fill="var(--color-offersCreatedCount)" radius={2} />
                            <Bar dataKey="offersPaidCount" fill="var(--color-offersPaidCount)" radius={2} />
                        </BarChart>
                    </ChartContainer>
                )}
            </Panel>
        </Reveal>
    );
}

export function CookAnalyticsProfileDemand({ viewCount }: { viewCount: number }) {
    const locale = useLocale();

    return (
        <Reveal as="section" index={4} className="grid gap-4" aria-labelledby="cook-analytics-profile">
            <SectionHeading
                id="cook-analytics-profile"
                title={t(locale, 'profileCook', 'analytics.profileTitle')}
                description={t(locale, 'profileCook', 'analytics.profileDescription')}
                help={{
                    label: t(locale, 'profileCook', 'analytics.help.profileLabel'),
                    body: t(locale, 'profileCook', 'analytics.help.profileBody'),
                }}
            />
            <Panel>
                <dl className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'profileCook', 'analytics.profileViews')}
                    </dt>
                    <dd className="font-serif text-4xl/tight tabular-nums text-foreground">{viewCount}</dd>
                </dl>
            </Panel>
        </Reveal>
    );
}

export function CookAnalyticsOfferCreateDisclosure({ stages }: { stages: GqlCProfileCookAnalyticsOfferCreateStageFragment[] }) {
    const locale = useLocale();
    const hasActivity = stages.some((stage) => stage.completedCount > 0 || stage.enteredCount > 0);
    const chartConfig = {
        completedCount: {
            label: t(locale, 'profileCook', 'analytics.chart.completed'),
            color: 'var(--foreground)',
        },
    } satisfies ChartConfig;
    const chartData = stages.map((stage) => ({
        label: stageLabel(stage.id, locale),
        completedCount: stage.completedCount,
        stepRate: stage.stepRate,
    }));

    return (
        <details className="group grid gap-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                    <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">
                        ▸
                    </span>
                    {t(locale, 'profileCook', 'analytics.offerCreateDisclosure')}
                    <MetricHelp
                        label={t(locale, 'profileCook', 'analytics.help.offerCreateLabel')}
                        body={t(locale, 'profileCook', 'analytics.help.offerCreateBody')}
                    />
                </span>
            </summary>
            <Panel>
                {!hasActivity ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'analytics.offerCreateEmpty')}</p>
                ) : (
                    <ChartContainer
                        config={chartConfig}
                        className="aspect-auto h-56 w-full"
                        aria-label={t(locale, 'profileCook', 'analytics.offerCreateDisclosure')}
                    >
                        <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                            <CartesianGrid horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="label" type="category" width={120} tickLine={false} axisLine={false} tickMargin={8} />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        formatter={(value, _name, item) => {
                                            const rate = item?.payload?.stepRate as number | null | undefined;
                                            const countLabel = String(value ?? 0);
                                            if (rate == null) return countLabel;
                                            return `${countLabel} · ${cookAnalyticsFormatPercent(rate, locale)}`;
                                        }}
                                    />
                                }
                            />
                            <Bar dataKey="completedCount" fill="var(--color-completedCount)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                )}
            </Panel>
        </details>
    );
}
