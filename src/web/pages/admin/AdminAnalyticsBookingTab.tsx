import { t } from '../../../i18n/t';
import type { GqlCAdminAnalyticsPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminAnalyticsFunnelBlock, sequentialDropOff } from './AdminAnalyticsFunnelBlock';
import { adminAnalyticsSearchForRange, adminTrafficSearchForAnalyticsTab } from './adminAnalyticsSearch';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import type { AdminOverviewDateRange } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { AdminRelatedPageLinks } from './AdminRelatedPageLink';

type AdminAnalyticsAdmin = NonNullable<NonNullable<GqlCAdminAnalyticsPageQuery['currentSession']['user']>['admin']>;

function marketplaceShare(count: number, total: number, locale: ReturnType<typeof useLocale>): string {
    if (total <= 0) return String(count);
    return t(locale, 'admin', 'analytics.countPercent', { count, percent: Math.round((count / total) * 100) });
}

export function AdminAnalyticsBookingTab({ admin, range }: { admin: AdminAnalyticsAdmin; range: AdminOverviewDateRange }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const flow = admin.bookingRequestFormFlow;
    const bookingCheckoutFlow = admin.bookingRequestCheckoutFlow;
    const formVisits = admin.formVisits ?? [];
    const formVisitCount = formVisits.reduce((sum, bucket) => sum + bucket.count, 0);
    const sessionsWithCompletion = flow?.sessionsWithCompletion ?? 0;
    const bookingRequestsCreated = flow?.bookingRequestsCreated ?? 0;
    const conversionPercent = formVisitCount > 0 ? Math.round((bookingRequestsCreated / formVisitCount) * 100) : null;

    const steps = flow?.steps ?? [];
    const stepsWithActivity = steps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const hasStepActivity = stepsWithActivity.length > 0;
    const showReachedColumn = stepsWithActivity.some((step) => step.id !== 'created' && step.enteredCount > 0);

    const bookingCheckoutSteps = bookingCheckoutFlow?.steps ?? [];
    const bookingCheckoutStepsWithActivity = bookingCheckoutSteps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const showBookingCheckoutReachedColumn = bookingCheckoutStepsWithActivity.some((step) => step.enteredCount > 0 && step.id !== 'paid');

    const marketplace = admin.bookingRequestMarketplaceStats;
    const marketplaceRequestCount = marketplace?.requestCount ?? 0;
    const customerSessionActivity = admin.customerSessionActivity;
    const customerMonthChartData = (customerSessionActivity?.monthBuckets ?? []).map((bucket) => ({
        bucketStart: bucket.bucketStart,
        count: bucket.count,
    }));
    const customerWeekChartData = (customerSessionActivity?.weekBuckets ?? []).map((bucket) => ({
        bucketStart: bucket.bucketStart,
        count: bucket.count,
    }));

    const sankeyEmptyCopy = (() => {
        if (hasStepActivity && flow && flow.nodes.length > 0 && flow.links.length === 0) {
            return t(locale, 'admin', 'copy.noTransitionsInThisRangeOnlySingleStepSessionsTheStepTableSh');
        }
        if (formVisitCount > 0 && !hasStepActivity) {
            return t(locale, 'admin', 'copy.noStructuredFunnelCompletionsInThisRangeYetVisitChartsCountA');
        }
        return t(locale, 'admin', 'copy.noFunnelDataInTheSelectedRange');
    })();

    return (
        <>
            <section className="grid gap-3">
                <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.overview')}</h2>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'copy.formVisits')}
                        value={formVisitCount}
                        to="/{-$locale}/admin/traffic"
                        search={adminTrafficSearchForAnalyticsTab(range, 'booking')}
                    />
                    <AdminOverviewStatCard label={t(locale, 'admin', 'copy.sessionsWithCompletion')} value={sessionsWithCompletion} />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'copy.requestsCreated')}
                        value={bookingRequestsCreated}
                        to="/{-$locale}/admin/booking-requests"
                        search={adminAnalyticsSearchForRange(range)}
                    />
                    <AdminOverviewStatCard label={t(locale, 'admin', 'copy.conversion')} value={conversionPercent ?? 0} />
                </dl>
                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'analytics.links.visitGrain')}</p>
                {conversionPercent == null && formVisitCount === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.conversionIsVisitRequestCreated0WhenThereAreNoFormVisits')}
                    </p>
                ) : null}
            </section>

            <AdminAnalyticsFunnelBlock
                title={t(locale, 'admin', 'copy.bookingFormFunnel')}
                description={
                    showReachedColumn
                        ? t(locale, 'admin', 'copy.humanNonAdminNonCookSessionsReachedStepEnteredCompletedStepF')
                        : t(locale, 'admin', 'copy.humanNonAdminNonCookSessionsCompletedStepFinishedIncludingMi')
                }
                steps={steps}
                showReachedColumn={showReachedColumn}
                reachedDisplay={(step) => (step.id === 'created' ? '-' : step.enteredCount)}
                dropOffForStep={sequentialDropOff}
                flow={flow}
                tableAriaLabel={t(locale, 'admin', 'copy.funnelSteps')}
                sankeyAriaLabel={t(locale, 'admin', 'copy.bookingFormSankey')}
                emptyCopy={sankeyEmptyCopy}
            />

            <AdminAnalyticsFunnelBlock
                title={t(locale, 'admin', 'copy.bookingCheckoutFunnel')}
                description={t(locale, 'admin', 'copy.humanNonAdminNonCookSessionsEndOfferPaymentSucceeded')}
                steps={bookingCheckoutSteps}
                showReachedColumn={showBookingCheckoutReachedColumn}
                reachedDisplay={(step) => (step.id === 'paid' ? '-' : step.enteredCount)}
                dropOffForStep={sequentialDropOff}
                flow={bookingCheckoutFlow}
                tableAriaLabel={t(locale, 'admin', 'copy.checkoutSteps')}
                sankeyAriaLabel={t(locale, 'admin', 'copy.bookingCheckoutSankey')}
                emptyCopy={t(locale, 'admin', 'copy.noCheckoutFunnelDataInTheSelectedRange')}
            >
                <dl className="grid gap-3 sm:grid-cols-2">
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'copy.sessionsWithCompletion')}
                        value={bookingCheckoutFlow?.sessionsWithCompletion ?? 0}
                    />
                    <AdminOverviewStatCard label={t(locale, 'admin', 'copy.paid')} value={bookingCheckoutFlow?.terminalCount ?? 0} />
                </dl>
            </AdminAnalyticsFunnelBlock>

            <section className="grid gap-3">
                <h2 className="text-lg font-medium">{t(locale, 'admin', 'analytics.marketplace.title')}</h2>
                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'analytics.marketplace.caption')}</p>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <AdminOverviewStatCard label={t(locale, 'admin', 'analytics.marketplace.requests')} value={marketplaceRequestCount} />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.marketplace.withOffer')}
                        value={marketplace?.withOfferCount ?? 0}
                        displayValue={marketplaceShare(marketplace?.withOfferCount ?? 0, marketplaceRequestCount, locale)}
                    />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.marketplace.dualAccepted')}
                        value={marketplace?.dualAcceptedCount ?? 0}
                        displayValue={marketplaceShare(marketplace?.dualAcceptedCount ?? 0, marketplaceRequestCount, locale)}
                    />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.marketplace.paid')}
                        value={marketplace?.paidCount ?? 0}
                        displayValue={marketplaceShare(marketplace?.paidCount ?? 0, marketplaceRequestCount, locale)}
                    />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.marketplace.paymentFailed')}
                        value={marketplace?.paymentFailedCount ?? 0}
                    />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.marketplace.chefDirect')}
                        value={marketplace?.chefDirectCount ?? 0}
                        displayValue={marketplaceShare(marketplace?.chefDirectCount ?? 0, marketplaceRequestCount, locale)}
                    />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.marketplace.radius')}
                        value={marketplace?.radiusCount ?? 0}
                        displayValue={marketplaceShare(marketplace?.radiusCount ?? 0, marketplaceRequestCount, locale)}
                    />
                </dl>
            </section>

            <section className="grid gap-3">
                <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'analytics.customerSessionActivity.title')}</h2>
                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'analytics.customerSessionActivity.caption')}</p>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.customerSessionActivity.activeCustomers')}
                        value={customerSessionActivity?.customerCount ?? 0}
                    />
                </dl>
                <h3 className="text-lg font-medium">{t(locale, 'admin', 'analytics.customerSessionActivity.byMonth')}</h3>
                <AdminOverviewBarChart
                    data={customerMonthChartData}
                    locale={locale}
                    timeZone={timeZone}
                    ariaLabel={t(locale, 'admin', 'analytics.customerSessionActivity.byMonth')}
                    bucketLabel="monthYear"
                />
                <h3 className="text-lg font-medium">{t(locale, 'admin', 'analytics.customerSessionActivity.byWeek')}</h3>
                <AdminOverviewBarChart
                    data={customerWeekChartData}
                    locale={locale}
                    timeZone={timeZone}
                    ariaLabel={t(locale, 'admin', 'analytics.customerSessionActivity.byWeek')}
                />
            </section>

            <AdminRelatedPageLinks
                links={[
                    {
                        to: '/{-$locale}/admin/booking-requests',
                        search: { from: range.from, to: range.to },
                        label: t(locale, 'admin', 'nav.bookingRequests.title'),
                    },
                    {
                        to: '/{-$locale}/admin/traffic',
                        search: adminTrafficSearchForAnalyticsTab(range, 'booking'),
                        label: t(locale, 'admin', 'nav.traffic.title'),
                    },
                ]}
            />
        </>
    );
}
