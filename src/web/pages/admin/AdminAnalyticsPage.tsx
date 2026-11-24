import { Link, useNavigate } from '@tanstack/react-router';
import type { DateRange } from 'react-day-picker';
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip, useChartWidth } from 'recharts';

import { t } from '../../../i18n/t';
import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Card, CardContent } from '../../components/base/card';
import { DateRangePicker } from '../../components/base/date-range-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/base/table';
import type { GqlCAdminAnalyticsPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';

const SANKEY_HEIGHT = 384;

function AdminAnalyticsSankeyNode({
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
        <Layer key={`sankey-node-${index}`}>
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

export function adminAnalyticsPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.analytics.title');
}
export function adminAnalyticsPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.analytics.description');
}

export function adminAnalyticsPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
        formVisitWebPageKey: 'BOOKING_REQUEST_FORM' as const,
    };
}

function dropOffPercent(previousCompleted: number, completed: number): number | null {
    if (previousCompleted <= 0) return null;
    return Math.round(((previousCompleted - completed) / previousCompleted) * 100);
}

/** Parent step for cook-funnel drop-off (branches, not previous table row). */
const COOK_FUNNEL_DROP_OFF_PARENT: Record<string, string | null> = {
    notified: null,
    opened: 'notified',
    declined: 'opened',
    offer_create: 'opened',
    menus: 'offer_create',
    price: 'menus',
    created: 'price',
};

function cookFunnelDropOffPercent(
    stepId: string,
    completedCount: number,
    stepsById: Map<string, { completedCount: number }>,
): number | null {
    const parentId = COOK_FUNNEL_DROP_OFF_PARENT[stepId];
    if (parentId == null) return null;
    const parent = stepsById.get(parentId);
    if (parent == null) return null;
    return dropOffPercent(parent.completedCount, completedCount);
}

function sankeyFromFlow(
    flow:
        | {
              nodes: ReadonlyArray<{ id: string; label: string }>;
              links: ReadonlyArray<{ source: string; target: string; value: number }>;
          }
        | null
        | undefined,
) {
    if (!flow || flow.links.length === 0) return null;
    const indexById = new Map(flow.nodes.map((node, index) => [node.id, index]));
    const nodes = flow.nodes.map((node) => ({
        name: node.label,
    }));
    const links = flow.links
        .map((link) => {
            const source = indexById.get(link.source);
            const target = indexById.get(link.target);
            if (source == null || target == null) return null;
            return { source, target, value: link.value };
        })
        .filter((link): link is { source: number; target: number; value: number } => link != null);
    if (links.length === 0) return null;
    return { nodes, links };
}

export function AdminAnalyticsPage({ data, search }: { data: GqlCAdminAnalyticsPageQuery; search: AdminOverviewRangeSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/analytics' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const flow = admin?.bookingRequestFormFlow;
    const giftCardFlow = admin?.giftCardFlow;
    const chefSignUpFlow = admin?.chefSignUpFlow;
    const bookingCheckoutFlow = admin?.bookingRequestCheckoutFlow;
    const cookOfferFlow = admin?.cookBookingRequestOfferFlow;
    const formVisits = admin?.formVisits ?? [];
    const signInMethodStats = admin?.signInMethodStats;
    const signInMethods = signInMethodStats?.methods ?? [];
    const signInBucketsByDate = new Map<
        string,
        { bucketStart: string; EMAIL_OTP: number; PASSKEY: number; GOOGLE: number; FACEBOOK: number }
    >();
    for (const bucket of signInMethodStats?.buckets ?? []) {
        const row = signInBucketsByDate.get(bucket.date) ?? {
            bucketStart: bucket.date,
            EMAIL_OTP: 0,
            PASSKEY: 0,
            GOOGLE: 0,
            FACEBOOK: 0,
        };
        row[bucket.method] = bucket.signInCount;
        signInBucketsByDate.set(bucket.date, row);
    }
    const signInChartData = Array.from(signInBucketsByDate.values());

    function signInMethodLabel(method: string): string {
        const labels = {
            EMAIL_OTP: t(locale, 'admin', 'copy.emailCode'),
            PASSKEY: t(locale, 'admin', 'copy.passkey'),
            GOOGLE: t(locale, 'admin', 'copy.google'),
            FACEBOOK: t(locale, 'admin', 'copy.facebook'),
        } as const;
        return method in labels ? labels[method as keyof typeof labels] : method;
    }

    const formVisitCount = formVisits.reduce((sum, bucket) => sum + bucket.count, 0);
    const sessionsWithCompletion = flow?.sessionsWithCompletion ?? 0;
    const bookingRequestsCreated = flow?.bookingRequestsCreated ?? 0;
    const conversionPercent = formVisitCount > 0 ? Math.round((bookingRequestsCreated / formVisitCount) * 100) : null;

    const steps = flow?.steps ?? [];
    const stepsWithActivity = steps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const hasStepActivity = stepsWithActivity.length > 0;
    // Migrated traffic only has step_completed; hide the empty Reached column until live step_entered exists.
    const showReachedColumn = stepsWithActivity.some((step) => step.id !== 'created' && step.enteredCount > 0);

    const cookNotifiedCount = cookOfferFlow?.notifiedCount ?? 0;
    const cookOpenedCount = cookOfferFlow?.openedCount ?? 0;
    const cookDeclinedCount = cookOfferFlow?.declinedCount ?? 0;
    const cookOffersCreatedCount = cookOfferFlow?.offersCreatedCount ?? 0;
    const cookConversionPercent = cookNotifiedCount > 0 ? Math.round((cookOffersCreatedCount / cookNotifiedCount) * 100) : null;
    const cookSteps = cookOfferFlow?.steps ?? [];
    const cookStepsById = new Map(cookSteps.map((step) => [step.id, step]));
    const cookStepsWithActivity = cookSteps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const hasCookStepActivity = cookStepsWithActivity.length > 0;
    const showCookReachedColumn = cookStepsWithActivity.some(
        (step) =>
            step.enteredCount > 0 && step.id !== 'notified' && step.id !== 'opened' && step.id !== 'declined' && step.id !== 'created',
    );

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

    const sankeyData = sankeyFromFlow(flow);
    const giftCardSankeyData = sankeyFromFlow(giftCardFlow);
    const chefSignUpSankeyData = sankeyFromFlow(chefSignUpFlow);
    const bookingCheckoutSankeyData = sankeyFromFlow(bookingCheckoutFlow);
    const cookSankeyData = sankeyFromFlow(cookOfferFlow);

    const giftCardSteps = giftCardFlow?.steps ?? [];
    const giftCardStepsWithActivity = giftCardSteps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const showGiftCardReachedColumn = giftCardStepsWithActivity.some(
        (step) => step.enteredCount > 0 && step.id !== 'created' && step.id !== 'paid',
    );
    const chefSignUpSteps = chefSignUpFlow?.steps ?? [];
    const chefSignUpStepsWithActivity = chefSignUpSteps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const showChefSignUpReachedColumn = chefSignUpStepsWithActivity.some((step) => step.enteredCount > 0 && step.id !== 'created');
    const bookingCheckoutSteps = bookingCheckoutFlow?.steps ?? [];
    const bookingCheckoutStepsWithActivity = bookingCheckoutSteps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const showBookingCheckoutReachedColumn = bookingCheckoutStepsWithActivity.some((step) => step.enteredCount > 0 && step.id !== 'paid');

    const sankeyEmptyCopy = (() => {
        if (hasStepActivity && flow && flow.nodes.length > 0 && flow.links.length === 0) {
            return t(locale, 'admin', 'copy.noTransitionsInThisRangeOnlySingleStepSessionsTheStepTableSh');
        }
        if (formVisitCount > 0 && !hasStepActivity) {
            return t(locale, 'admin', 'copy.noStructuredFunnelCompletionsInThisRangeYetVisitChartsCountA');
        }
        return t(locale, 'admin', 'copy.noFunnelDataInTheSelectedRange');
    })();

    const cookSankeyEmptyCopy = (() => {
        if (hasCookStepActivity && cookOfferFlow && cookOfferFlow.nodes.length > 0 && cookOfferFlow.links.length === 0) {
            return t(locale, 'admin', 'copy.noTransitionsInThisRangeTheStepTableShowsReach');
        }
        return t(locale, 'admin', 'copy.noCookOfferFunnelDataInTheSelectedRangeCohortNotifiedCooks');
    })();

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="grid gap-2">
                        <h1 className="font-serif text-4xl/tight text-foreground">{adminAnalyticsPageTitle(locale)}</h1>
                        <p className="text-muted-foreground">{adminAnalyticsPageDescription(locale)}</p>
                    </div>
                    <DateRangePicker
                        value={pickerValue}
                        onValueChange={onRangeChange}
                        locale={DATE_FNS_LOCALE[locale]}
                        placeholder={t(locale, 'admin', 'copy.pickADateRange')}
                        className="w-auto"
                        aria-label={t(locale, 'admin', 'copy.dateRangeForAnalytics')}
                    />
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.overview')}</h2>
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <AdminOverviewStatCard label={t(locale, 'admin', 'copy.formVisits')} value={formVisitCount} />
                        <AdminOverviewStatCard label={t(locale, 'admin', 'copy.sessionsWithCompletion')} value={sessionsWithCompletion} />
                        <AdminOverviewStatCard label={t(locale, 'admin', 'copy.requestsCreated')} value={bookingRequestsCreated} />
                        <AdminOverviewStatCard label={t(locale, 'admin', 'copy.conversion')} value={conversionPercent ?? 0} />
                    </dl>
                    {conversionPercent == null && formVisitCount === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'admin', 'copy.conversionIsVisitRequestCreated0WhenThereAreNoFormVisits')}
                        </p>
                    ) : null}
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'copy.signInMethods')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.humanSessionsWithoutImpersonationCooksIncludedSignInsExistin')}
                    </p>
                    <Table aria-label={t(locale, 'admin', 'copy.signInMethods')}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t(locale, 'admin', 'copy.method')}</TableHead>
                                <TableHead className="text-right">{t(locale, 'admin', 'copy.signIns')}</TableHead>
                                <TableHead className="text-right">{t(locale, 'admin', 'copy.registrations')}</TableHead>
                                <TableHead className="text-right">{t(locale, 'admin', 'copy.accountsCreated')}</TableHead>
                                <TableHead className="text-right">{t(locale, 'admin', 'copy.failures')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {signInMethods.map((row) => (
                                <TableRow key={row.method}>
                                    <TableCell className="font-medium">{signInMethodLabel(row.method)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{row.signInCount}</TableCell>
                                    <TableCell className="text-right tabular-nums">{row.registrationTicketCount}</TableCell>
                                    <TableCell className="text-right tabular-nums">{row.accountCreatedCount}</TableCell>
                                    <TableCell className="text-right tabular-nums">{row.failedCount}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <AdminOverviewBarChart
                        data={signInChartData}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={t(locale, 'admin', 'copy.signInsByMethod')}
                        series={[
                            { dataKey: 'EMAIL_OTP', label: signInMethodLabel('EMAIL_OTP'), color: 'var(--chart-2)' },
                            { dataKey: 'PASSKEY', label: signInMethodLabel('PASSKEY'), color: 'var(--chart-3)' },
                            { dataKey: 'GOOGLE', label: signInMethodLabel('GOOGLE'), color: 'var(--chart-1)' },
                            { dataKey: 'FACEBOOK', label: signInMethodLabel('FACEBOOK'), color: 'var(--chart-4)' },
                        ]}
                    />
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'copy.bookingFormFunnel')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {showReachedColumn
                            ? t(locale, 'admin', 'copy.humanNonAdminNonCookSessionsReachedStepEnteredCompletedStepF')
                            : t(locale, 'admin', 'copy.humanNonAdminNonCookSessionsCompletedStepFinishedIncludingMi')}
                    </p>

                    {hasStepActivity ? (
                        <Card>
                            <CardContent className="pt-4">
                                <Table aria-label={t(locale, 'admin', 'copy.funnelSteps')}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t(locale, 'admin', 'copy.step')}</TableHead>
                                            {showReachedColumn ? (
                                                <TableHead className="text-right">{t(locale, 'admin', 'copy.reached')}</TableHead>
                                            ) : null}
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.completed2')}</TableHead>
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.dropOff')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stepsWithActivity.map((step, index) => {
                                            const previous = stepsWithActivity[index - 1];
                                            const dropOff =
                                                previous == null ? null : dropOffPercent(previous.completedCount, step.completedCount);
                                            return (
                                                <TableRow key={step.id}>
                                                    <TableCell className="font-medium">{step.label}</TableCell>
                                                    {showReachedColumn ? (
                                                        <TableCell className="text-right tabular-nums">
                                                            {step.id === 'created' ? '-' : step.enteredCount}
                                                        </TableCell>
                                                    ) : null}
                                                    <TableCell className="text-right tabular-nums">{step.completedCount}</TableCell>
                                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                                        {dropOff == null ? '-' : `${dropOff}%`}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : null}

                    {sankeyData ? (
                        <Card>
                            <CardContent className="pt-4">
                                <div
                                    className="w-full"
                                    style={{ height: SANKEY_HEIGHT }}
                                    aria-label={t(locale, 'admin', 'copy.bookingFormSankey')}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={SANKEY_HEIGHT}
                                        initialDimension={{ width: 640, height: SANKEY_HEIGHT }}
                                    >
                                        <Sankey
                                            data={sankeyData}
                                            nodePadding={24}
                                            margin={{ top: 12, right: 160, bottom: 12, left: 12 }}
                                            link={{ stroke: 'var(--foreground)', strokeOpacity: 0.2 }}
                                            node={AdminAnalyticsSankeyNode}
                                        >
                                            <Tooltip />
                                        </Sankey>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <p className="text-sm text-muted-foreground">{sankeyEmptyCopy}</p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'copy.giftCardFunnel')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.humanNonAdminNonCookSessionsEndGiftCardPaid')}
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.sessionsWithCompletion')}
                            value={giftCardFlow?.sessionsWithCompletion ?? 0}
                        />
                        <AdminOverviewStatCard label={t(locale, 'admin', 'copy.paid')} value={giftCardFlow?.terminalCount ?? 0} />
                    </dl>
                    {giftCardStepsWithActivity.length > 0 ? (
                        <Card>
                            <CardContent className="pt-4">
                                <Table aria-label={t(locale, 'admin', 'copy.giftCardSteps')}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t(locale, 'admin', 'copy.step')}</TableHead>
                                            {showGiftCardReachedColumn ? (
                                                <TableHead className="text-right">{t(locale, 'admin', 'copy.reached')}</TableHead>
                                            ) : null}
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.completed2')}</TableHead>
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.dropOff')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {giftCardStepsWithActivity.map((step, index) => {
                                            const previous = giftCardStepsWithActivity[index - 1];
                                            const dropOff =
                                                previous == null ? null : dropOffPercent(previous.completedCount, step.completedCount);
                                            return (
                                                <TableRow key={step.id}>
                                                    <TableCell className="font-medium">{step.label}</TableCell>
                                                    {showGiftCardReachedColumn ? (
                                                        <TableCell className="text-right tabular-nums">
                                                            {step.id === 'created' || step.id === 'paid' ? '-' : step.enteredCount}
                                                        </TableCell>
                                                    ) : null}
                                                    <TableCell className="text-right tabular-nums">{step.completedCount}</TableCell>
                                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                                        {dropOff == null ? '-' : `${dropOff}%`}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : null}
                    {giftCardSankeyData ? (
                        <Card>
                            <CardContent className="pt-4">
                                <div
                                    className="w-full"
                                    style={{ height: SANKEY_HEIGHT }}
                                    aria-label={t(locale, 'admin', 'copy.giftCardSankey')}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={SANKEY_HEIGHT}
                                        initialDimension={{ width: 640, height: SANKEY_HEIGHT }}
                                    >
                                        <Sankey
                                            data={giftCardSankeyData}
                                            nodePadding={24}
                                            margin={{ top: 12, right: 160, bottom: 12, left: 12 }}
                                            link={{ stroke: 'var(--foreground)', strokeOpacity: 0.2 }}
                                            node={AdminAnalyticsSankeyNode}
                                        >
                                            <Tooltip />
                                        </Sankey>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noGiftCardFunnelDataInTheSelectedRange')}</p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'copy.bookingCheckoutFunnel')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.humanNonAdminNonCookSessionsEndOfferPaymentSucceeded')}
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.sessionsWithCompletion')}
                            value={bookingCheckoutFlow?.sessionsWithCompletion ?? 0}
                        />
                        <AdminOverviewStatCard label={t(locale, 'admin', 'copy.paid')} value={bookingCheckoutFlow?.terminalCount ?? 0} />
                    </dl>
                    {bookingCheckoutStepsWithActivity.length > 0 ? (
                        <Card>
                            <CardContent className="pt-4">
                                <Table aria-label={t(locale, 'admin', 'copy.checkoutSteps')}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t(locale, 'admin', 'copy.step')}</TableHead>
                                            {showBookingCheckoutReachedColumn ? (
                                                <TableHead className="text-right">{t(locale, 'admin', 'copy.reached')}</TableHead>
                                            ) : null}
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.completed2')}</TableHead>
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.dropOff')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bookingCheckoutStepsWithActivity.map((step, index) => {
                                            const previous = bookingCheckoutStepsWithActivity[index - 1];
                                            const dropOff =
                                                previous == null ? null : dropOffPercent(previous.completedCount, step.completedCount);
                                            return (
                                                <TableRow key={step.id}>
                                                    <TableCell className="font-medium">{step.label}</TableCell>
                                                    {showBookingCheckoutReachedColumn ? (
                                                        <TableCell className="text-right tabular-nums">
                                                            {step.id === 'paid' ? '-' : step.enteredCount}
                                                        </TableCell>
                                                    ) : null}
                                                    <TableCell className="text-right tabular-nums">{step.completedCount}</TableCell>
                                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                                        {dropOff == null ? '-' : `${dropOff}%`}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : null}
                    {bookingCheckoutSankeyData ? (
                        <Card>
                            <CardContent className="pt-4">
                                <div
                                    className="w-full"
                                    style={{ height: SANKEY_HEIGHT }}
                                    aria-label={t(locale, 'admin', 'copy.bookingCheckoutSankey')}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={SANKEY_HEIGHT}
                                        initialDimension={{ width: 640, height: SANKEY_HEIGHT }}
                                    >
                                        <Sankey
                                            data={bookingCheckoutSankeyData}
                                            nodePadding={24}
                                            margin={{ top: 12, right: 160, bottom: 12, left: 12 }}
                                            link={{ stroke: 'var(--foreground)', strokeOpacity: 0.2 }}
                                            node={AdminAnalyticsSankeyNode}
                                        >
                                            <Tooltip />
                                        </Sankey>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noCheckoutFunnelDataInTheSelectedRange')}</p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'copy.chefSignUpFunnel')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.humanNonAdminSessionsCooksIncludedEndChefAccountCreated')}
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.sessionsWithCompletion')}
                            value={chefSignUpFlow?.sessionsWithCompletion ?? 0}
                        />
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.chefAccountsCreated')}
                            value={chefSignUpFlow?.terminalCount ?? 0}
                        />
                    </dl>
                    {chefSignUpStepsWithActivity.length > 0 ? (
                        <Card>
                            <CardContent className="pt-4">
                                <Table aria-label={t(locale, 'admin', 'copy.chefSignUpSteps')}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t(locale, 'admin', 'copy.step')}</TableHead>
                                            {showChefSignUpReachedColumn ? (
                                                <TableHead className="text-right">{t(locale, 'admin', 'copy.reached')}</TableHead>
                                            ) : null}
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.completed2')}</TableHead>
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.dropOff')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {chefSignUpStepsWithActivity.map((step, index) => {
                                            const previous = chefSignUpStepsWithActivity[index - 1];
                                            const dropOff =
                                                previous == null ? null : dropOffPercent(previous.completedCount, step.completedCount);
                                            return (
                                                <TableRow key={step.id}>
                                                    <TableCell className="font-medium">{step.label}</TableCell>
                                                    {showChefSignUpReachedColumn ? (
                                                        <TableCell className="text-right tabular-nums">
                                                            {step.id === 'created' ? '-' : step.enteredCount}
                                                        </TableCell>
                                                    ) : null}
                                                    <TableCell className="text-right tabular-nums">{step.completedCount}</TableCell>
                                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                                        {dropOff == null ? '-' : `${dropOff}%`}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : null}
                    {chefSignUpSankeyData ? (
                        <Card>
                            <CardContent className="pt-4">
                                <div
                                    className="w-full"
                                    style={{ height: SANKEY_HEIGHT }}
                                    aria-label={t(locale, 'admin', 'copy.chefSignUpSankey')}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={SANKEY_HEIGHT}
                                        initialDimension={{ width: 640, height: SANKEY_HEIGHT }}
                                    >
                                        <Sankey
                                            data={chefSignUpSankeyData}
                                            nodePadding={24}
                                            margin={{ top: 12, right: 160, bottom: 12, left: 12 }}
                                            link={{ stroke: 'var(--foreground)', strokeOpacity: 0.2 }}
                                            node={AdminAnalyticsSankeyNode}
                                        >
                                            <Tooltip />
                                        </Sankey>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'admin', 'copy.noChefSignUpFunnelDataInTheSelectedRange')}
                        </p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'copy.cookOfferFunnel')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.cohortCooksNotifiedInRangeExcludingAdminsDeclinedAndStartOff')}
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <AdminOverviewStatCard label={t(locale, 'admin', 'copy.notified')} value={cookNotifiedCount} />
                        <AdminOverviewStatCard label={t(locale, 'admin', 'copy.opened')} value={cookOpenedCount} />
                        <AdminOverviewStatCard label={t(locale, 'admin', 'copy.declined')} value={cookDeclinedCount} />
                        <AdminOverviewStatCard label={t(locale, 'admin', 'copy.offersCreated')} value={cookOffersCreatedCount} />
                    </dl>
                    {cookNotifiedCount > 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'admin', 'analytics.cookConversion', { percent: cookConversionPercent ?? 0 })}
                        </p>
                    ) : null}

                    {hasCookStepActivity ? (
                        <Card>
                            <CardContent className="pt-4">
                                <Table aria-label={t(locale, 'admin', 'copy.cookFunnelSteps')}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t(locale, 'admin', 'copy.step')}</TableHead>
                                            {showCookReachedColumn ? (
                                                <TableHead className="text-right">{t(locale, 'admin', 'copy.reached')}</TableHead>
                                            ) : null}
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.completed2')}</TableHead>
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.dropOff')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cookStepsWithActivity.map((step) => {
                                            const dropOff = cookFunnelDropOffPercent(step.id, step.completedCount, cookStepsById);
                                            return (
                                                <TableRow key={step.id}>
                                                    <TableCell className="font-medium">{step.label}</TableCell>
                                                    {showCookReachedColumn ? (
                                                        <TableCell className="text-right tabular-nums">
                                                            {step.enteredCount > 0 ? step.enteredCount : '-'}
                                                        </TableCell>
                                                    ) : null}
                                                    <TableCell className="text-right tabular-nums">{step.completedCount}</TableCell>
                                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                                        {dropOff == null ? '-' : `${dropOff}%`}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : null}

                    {cookSankeyData ? (
                        <Card>
                            <CardContent className="pt-4">
                                <div
                                    className="w-full"
                                    style={{ height: SANKEY_HEIGHT }}
                                    aria-label={t(locale, 'admin', 'copy.cookOfferSankey')}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={SANKEY_HEIGHT}
                                        initialDimension={{ width: 640, height: SANKEY_HEIGHT }}
                                    >
                                        <Sankey
                                            data={cookSankeyData}
                                            nodePadding={24}
                                            margin={{ top: 12, right: 160, bottom: 12, left: 12 }}
                                            link={{ stroke: 'var(--foreground)', strokeOpacity: 0.2 }}
                                            node={AdminAnalyticsSankeyNode}
                                        >
                                            <Tooltip />
                                        </Sankey>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <p className="text-sm text-muted-foreground">{cookSankeyEmptyCopy}</p>
                    )}
                </section>

                <p className="text-sm text-muted-foreground">
                    <Link to="/{-$locale}/admin/traffic" className="underline-offset-4 hover:underline">
                        {t(locale, 'admin', 'traffic.pageVisitsLiveOnTraffic')}
                    </Link>
                </p>
            </main>
        </AdminPathPageChrome>
    );
}
