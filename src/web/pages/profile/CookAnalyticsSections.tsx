import { Link } from '@tanstack/react-router';
import { CircleHelpIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

import { t } from '../../../i18n/t';
import { formatCurrency, formatDate } from '../../../shared';
import type { CookAnalyticsChannel } from '../../../shared';
import { Button } from '../../components/base/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/base/chart';
import type { ChartConfig } from '../../components/base/chart';
import type { StatusTone } from '../../components/base/status';
import { StatusAlert } from '../../components/base/status-alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
import { Reveal } from '../../components/Reveal';
import type {
    GqlCProfileCookAnalyticsCatalogRowFragment,
    GqlCProfileCookAnalyticsFragment,
    GqlCProfileCookAnalyticsFunnelFragment,
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
        default:
            return stageId;
    }
}

type CookAnalyticsInsight = { key: string; tone: StatusTone; title: string };

function cookAnalyticsInsights(analytics: GqlCProfileCookAnalyticsFragment, locale: ReturnType<typeof useLocale>): CookAnalyticsInsight[] {
    const insights: CookAnalyticsInsight[] = [];
    const direct = analytics.funnels.find((funnel) => funnel.channel === 'DIRECT');
    const pool = analytics.funnels.find((funnel) => funnel.channel === 'POOL');
    const directOpened = direct?.stages.find((stage) => stage.id === 'opened')?.count ?? 0;
    const directOffers = direct?.stages.find((stage) => stage.id === 'offer_sent')?.count ?? 0;
    const poolOpened = pool?.stages.find((stage) => stage.id === 'opened')?.count ?? 0;
    const poolOffers = pool?.stages.find((stage) => stage.id === 'offer_sent')?.count ?? 0;
    const topMeals = analytics.topMeals ?? [];
    const topAddons = analytics.topAddons ?? [];
    const mealOpenedNeverBooked = topMeals.find((meal) => meal.publicOpenCount >= 5 && meal.selectedCount === 0);
    const addonOftenSelected = topAddons.find(
        (addon) => analytics.offersPaidCount >= 3 && addon.selectedCount >= 3 && addon.selectedCount / analytics.offersPaidCount >= 0.75,
    );

    if ((direct?.entryCount ?? 0) > 0 && directOpened > 0 && directOffers === 0) {
        insights.push({
            key: 'directOpenedNoOffer',
            tone: 'warning',
            title: t(locale, 'profileCook', 'analytics.insights.directOpenedNoOffer'),
        });
    }
    if (analytics.openRate != null && analytics.openRate < 0.5 && analytics.requestsNotifiedCount >= 5) {
        insights.push({
            key: 'lowOpenRate',
            tone: 'warning',
            title: t(locale, 'profileCook', 'analytics.insights.lowOpenRate'),
        });
    }
    if (mealOpenedNeverBooked) {
        insights.push({
            key: 'mealOpenedNeverBooked',
            tone: 'warning',
            title: t(locale, 'profileCook', 'analytics.insights.mealOpenedNeverBooked', { title: mealOpenedNeverBooked.title }),
        });
    }
    if (analytics.offerCreateRate != null && analytics.offerCreateRate >= 0.7 && analytics.requestsOpenedCount >= 5) {
        insights.push({
            key: 'strongOfferRate',
            tone: 'success',
            title: t(locale, 'profileCook', 'analytics.insights.strongOfferRate'),
        });
    }
    if (poolOpened > 0 && poolOffers > 0 && poolOffers / poolOpened >= 0.75) {
        insights.push({
            key: 'poolOfferFollowThrough',
            tone: 'success',
            title: t(locale, 'profileCook', 'analytics.insights.poolOfferFollowThrough'),
        });
    }
    if (addonOftenSelected) {
        insights.push({
            key: 'addonOftenSelected',
            tone: 'success',
            title: t(locale, 'profileCook', 'analytics.insights.addonOftenSelected', { title: addonOftenSelected.title }),
        });
    }
    if (analytics.offersCreatedCount > 0 && analytics.offerConversionRate != null && analytics.offerConversionRate < 0.25) {
        insights.push({
            key: 'lowConversion',
            tone: 'info',
            title: t(locale, 'profileCook', 'analytics.insights.lowConversion'),
        });
    }
    return insights.slice(0, 2);
}

export function CookAnalyticsInsights({ analytics }: { analytics: GqlCProfileCookAnalyticsFragment }) {
    const locale = useLocale();
    const insights = cookAnalyticsInsights(analytics, locale);
    if (insights.length === 0) return null;

    return (
        <Reveal as="section" className="grid gap-2" aria-label={t(locale, 'profileCook', 'analytics.insights.label')}>
            {insights.map((insight) => (
                <StatusAlert key={insight.key} tone={insight.tone} title={insight.title} />
            ))}
        </Reveal>
    );
}

export function CookAnalyticsHero({ analytics }: { analytics: GqlCProfileCookAnalyticsFragment }) {
    const locale = useLocale();
    const entryCount = analytics.funnels.reduce((sum, funnel) => sum + funnel.entryCount, 0);

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
                            {' · '}
                            {t(locale, 'profileCook', 'analytics.heroTimeToOpen', {
                                time: cookAnalyticsFormatDurationMinutes(analytics.medianNotifyToOpenMinutes, locale),
                            })}
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
                    </div>
                </Panel>
                <Panel>
                    <div className="grid gap-2">
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t(locale, 'profileCook', 'analytics.avgMenuPrice')}
                            </p>
                            <MetricHelp
                                label={t(locale, 'profileCook', 'analytics.help.avgMenuPriceLabel')}
                                body={t(locale, 'profileCook', 'analytics.help.avgMenuPriceBody')}
                            />
                        </div>
                        <p className="font-serif text-4xl/tight tabular-nums text-foreground">
                            {analytics.averageMenuPriceCents == null
                                ? t(locale, 'profileCook', 'format.na')
                                : formatCurrency(analytics.averageMenuPriceCents, { locale, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </Panel>
            </div>
        </Reveal>
    );
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
    const paidCount = funnel.stages.find((stage) => stage.id === 'paid')?.count ?? 0;
    const openedCount = funnel.stages.find((stage) => stage.id === 'opened')?.count ?? 0;
    const entryToPaid = funnel.entryCount > 0 ? paidCount / funnel.entryCount : null;

    return (
        <Panel className="grid gap-4">
            <div className="grid gap-1">
                <h3 className="text-sm font-medium text-foreground">{title}</h3>
                {funnel.entryCount === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'analytics.funnelEmptyPeriod')}</p>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'profileCook', 'analytics.funnelEntryToPaid', {
                                entry: funnel.entryCount,
                                paid: paidCount,
                                rate: cookAnalyticsFormatPercent(entryToPaid, locale),
                            })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'profileCook', 'analytics.funnelOpenedOf', { opened: openedCount, entry: funnel.entryCount })}
                        </p>
                    </>
                )}
                <LowVolumeNote count={funnel.entryCount} />
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
        </Panel>
    );
}

export function CookAnalyticsFunnelPair({
    funnels,
    channel,
    analytics,
}: {
    funnels: GqlCProfileCookAnalyticsFunnelFragment[];
    channel: CookAnalyticsChannel;
    analytics: GqlCProfileCookAnalyticsFragment;
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
            <Panel>
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
        </Reveal>
    );
}

function CatalogMetric({ label, value }: { label: string; value: number }) {
    if (value <= 0) return null;
    return (
        <div className="grid gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm tabular-nums text-foreground">{value}</dd>
        </div>
    );
}

function CatalogList({
    title,
    rows,
    metrics,
    titleLink,
}: {
    title: string;
    rows: GqlCProfileCookAnalyticsCatalogRowFragment[];
    metrics: Array<'opened' | 'requested' | 'offered' | 'selected' | 'paid'>;
    titleLink: (row: GqlCProfileCookAnalyticsCatalogRowFragment) => ReactNode;
}) {
    const locale = useLocale();
    if (rows.length === 0) return null;

    return (
        <Panel className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            <ul className="grid gap-3">
                {rows.map((row) => (
                    <li key={row.id} className="grid gap-2 border-t border-border/60 pt-3 first:border-t-0 first:pt-0">
                        {titleLink(row)}
                        <dl className="flex flex-wrap gap-x-4 gap-y-2">
                            {metrics.includes('paid') ? (
                                <CatalogMetric label={t(locale, 'profileCook', 'analytics.catalogPaid')} value={row.paidCount} />
                            ) : null}
                            {metrics.includes('selected') ? (
                                <CatalogMetric label={t(locale, 'profileCook', 'analytics.catalogSelected')} value={row.selectedCount} />
                            ) : null}
                            {metrics.includes('requested') ? (
                                <CatalogMetric label={t(locale, 'profileCook', 'analytics.catalogRequested')} value={row.requestedCount} />
                            ) : null}
                            {metrics.includes('offered') ? (
                                <CatalogMetric label={t(locale, 'profileCook', 'analytics.catalogOffered')} value={row.offeredCount} />
                            ) : null}
                            {metrics.includes('opened') ? (
                                <CatalogMetric label={t(locale, 'profileCook', 'analytics.catalogOpened')} value={row.publicOpenCount} />
                            ) : null}
                        </dl>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}

const catalogTitleClassName = 'text-sm font-medium text-foreground underline-offset-4 hover:underline';

export function CookAnalyticsCatalog({ analytics }: { analytics: GqlCProfileCookAnalyticsFragment }) {
    const locale = useLocale();
    const topMenus = analytics.topMenus ?? [];
    const topMeals = analytics.topMeals ?? [];
    const topAddons = analytics.topAddons ?? [];
    const hasRows = topMenus.length > 0 || topMeals.length > 0 || topAddons.length > 0;

    return (
        <Reveal as="section" className="grid gap-4" aria-labelledby="cook-analytics-catalog">
            <SectionHeading
                id="cook-analytics-catalog"
                title={t(locale, 'profileCook', 'analytics.catalogTitle')}
                description={t(locale, 'profileCook', 'analytics.catalogDescription')}
                help={{
                    label: t(locale, 'profileCook', 'analytics.help.catalogLabel'),
                    body: t(locale, 'profileCook', 'analytics.help.catalogBody'),
                }}
            />
            {hasRows ? (
                <div className="grid gap-4">
                    <CatalogList
                        title={t(locale, 'profileCook', 'analytics.catalogMenus')}
                        rows={topMenus}
                        metrics={['paid', 'selected', 'requested', 'opened']}
                        titleLink={(row) => (
                            <Link to="/{-$locale}/profile/menus/$menuId" params={{ menuId: row.id }} className={catalogTitleClassName}>
                                {row.title}
                            </Link>
                        )}
                    />
                    <CatalogList
                        title={t(locale, 'profileCook', 'analytics.catalogMeals')}
                        rows={topMeals}
                        metrics={['paid', 'selected', 'opened']}
                        titleLink={(row) => (
                            <Link to="/{-$locale}/profile/meals/$mealId" params={{ mealId: row.id }} className={catalogTitleClassName}>
                                {row.title}
                            </Link>
                        )}
                    />
                    <CatalogList
                        title={t(locale, 'profileCook', 'analytics.catalogAddons')}
                        rows={topAddons}
                        metrics={['paid', 'selected', 'offered']}
                        titleLink={(row) => (
                            <Link to="/{-$locale}/profile/offer-addons" className={catalogTitleClassName}>
                                {row.title}
                            </Link>
                        )}
                    />
                </div>
            ) : (
                <Panel>
                    <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'analytics.catalogEmpty')}</p>
                </Panel>
            )}
        </Reveal>
    );
}

export function CookAnalyticsChefPage({ analytics }: { analytics: GqlCProfileCookAnalyticsFragment }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const visitsOrPaid = analytics.trend.some((point) => point.publicProfileViewCount > 0 || point.offersPaidCount > 0);
    const offersOnly = !visitsOrPaid && analytics.trend.some((point) => point.offersCreatedCount > 0);
    const hasSignal = visitsOrPaid || offersOnly;
    const chartConfig = {
        publicProfileViewCount: {
            label: t(locale, 'profileCook', 'analytics.profileViews'),
            color: 'var(--muted-foreground)',
        },
        offersPaidCount: {
            label: t(locale, 'profileCook', 'analytics.paid'),
            color: 'var(--accent)',
        },
        offersCreatedCount: {
            label: t(locale, 'profileCook', 'analytics.offersCreated'),
            color: 'var(--foreground)',
        },
    } satisfies ChartConfig;
    const chartData = analytics.trend.map((point) => ({
        ...point,
        label: formatDate(point.bucketStart, { locale, timeZone, dateStyle: 'short' }),
    }));

    return (
        <Reveal as="section" index={3} className="grid gap-4" aria-labelledby="cook-analytics-profile">
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
                    <dd className="font-serif text-4xl/tight tabular-nums text-foreground">{analytics.publicProfileViewCount}</dd>
                </dl>
            </Panel>
            <Panel>
                <div className="grid gap-3">
                    <h3 className="text-sm font-medium text-foreground">{t(locale, 'profileCook', 'analytics.trendTitle')}</h3>
                    <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'analytics.trendDescription')}</p>
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
                                                return bucketStart
                                                    ? formatDate(bucketStart, { locale, timeZone, dateStyle: 'medium' })
                                                    : '';
                                            }}
                                        />
                                    }
                                />
                                <Bar dataKey="publicProfileViewCount" fill="var(--color-publicProfileViewCount)" radius={2} />
                                {offersOnly ? (
                                    <Bar dataKey="offersCreatedCount" fill="var(--color-offersCreatedCount)" radius={2} />
                                ) : (
                                    <Bar dataKey="offersPaidCount" fill="var(--color-offersPaidCount)" radius={2} />
                                )}
                            </BarChart>
                        </ChartContainer>
                    )}
                </div>
            </Panel>
        </Reveal>
    );
}
