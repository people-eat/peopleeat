import { t } from '../../../i18n/t';
import type { GqlCAdminAnalyticsPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminAnalyticsFunnelBlock, dropOffPercent, sequentialDropOff } from './AdminAnalyticsFunnelBlock';
import type { AdminAnalyticsFunnelStep } from './AdminAnalyticsFunnelBlock';
import { adminTrafficSearchForAnalyticsTab } from './adminAnalyticsSearch';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import type { AdminOverviewDateRange } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { AdminRelatedPageLinks } from './AdminRelatedPageLink';
import { adminUsersSectionTo } from './adminUsers';

type AdminAnalyticsAdmin = NonNullable<NonNullable<GqlCAdminAnalyticsPageQuery['currentSession']['user']>['admin']>;

const COOK_FUNNEL_DROP_OFF_PARENT: Record<string, string | null> = {
    notified: null,
    opened: 'notified',
    declined: 'opened',
    offer_create: 'opened',
    menus: 'offer_create',
    price: 'menus',
    message: 'price',
    created: 'message',
};

function formatMedianHours(minutes: number | null | undefined, locale: ReturnType<typeof useLocale>): string {
    if (minutes == null || !Number.isFinite(minutes) || minutes < 0) {
        return t(locale, 'admin', 'copy.nA');
    }
    if (minutes < 60) {
        return t(locale, 'admin', 'analytics.format.underOneHour');
    }
    const hours = Math.round((minutes / 60) * 10) / 10;
    return t(locale, 'admin', 'analytics.format.hours', { hours });
}

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

export function AdminAnalyticsCooksTab({ admin, range }: { admin: AdminAnalyticsAdmin; range: AdminOverviewDateRange }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const cookSessionActivity = admin.cookSessionActivity;
    const chefSignUpFlow = admin.chefSignUpFlow;
    const cookOfferFlow = admin.cookBookingRequestOfferFlow;

    const chefSignUpSteps = chefSignUpFlow?.steps ?? [];
    const chefSignUpStepsWithActivity = chefSignUpSteps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const showChefSignUpReachedColumn = chefSignUpStepsWithActivity.some((step) => step.enteredCount > 0 && step.id !== 'created');

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

    const cookSankeyEmptyCopy = (() => {
        if (hasCookStepActivity && cookOfferFlow && cookOfferFlow.nodes.length > 0 && cookOfferFlow.links.length === 0) {
            return t(locale, 'admin', 'copy.noTransitionsInThisRangeTheStepTableShowsReach');
        }
        return t(locale, 'admin', 'copy.noCookOfferFunnelDataInTheSelectedRangeCohortNotifiedCooks');
    })();

    function cookDropOff(step: AdminAnalyticsFunnelStep): number | null {
        return cookFunnelDropOffPercent(step.id, step.completedCount, cookStepsById);
    }

    const monthChartData = (cookSessionActivity?.monthBuckets ?? []).map((bucket) => ({
        bucketStart: bucket.bucketStart,
        count: bucket.count,
    }));
    const weekChartData = (cookSessionActivity?.weekBuckets ?? []).map((bucket) => ({
        bucketStart: bucket.bucketStart,
        count: bucket.count,
    }));

    return (
        <>
            <section className="grid gap-3">
                <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'analytics.cookSessionActivity.title')}</h2>
                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'analytics.cookSessionActivity.caption')}</p>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.cookSessionActivity.activeCooks')}
                        value={cookSessionActivity?.cookCount ?? 0}
                    />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.cookSessionActivity.productiveCooks')}
                        value={cookSessionActivity?.productiveCookCount ?? 0}
                    />
                </dl>
                <h3 className="text-lg font-medium">{t(locale, 'admin', 'analytics.cookSessionActivity.byMonth')}</h3>
                <AdminOverviewBarChart
                    data={monthChartData}
                    locale={locale}
                    timeZone={timeZone}
                    ariaLabel={t(locale, 'admin', 'analytics.cookSessionActivity.byMonth')}
                    bucketLabel="monthYear"
                />
                <h3 className="text-lg font-medium">{t(locale, 'admin', 'analytics.cookSessionActivity.byWeek')}</h3>
                <AdminOverviewBarChart
                    data={weekChartData}
                    locale={locale}
                    timeZone={timeZone}
                    ariaLabel={t(locale, 'admin', 'analytics.cookSessionActivity.byWeek')}
                />
            </section>

            <AdminAnalyticsFunnelBlock
                title={t(locale, 'admin', 'copy.chefSignUpFunnel')}
                description={t(locale, 'admin', 'copy.humanNonAdminSessionsCooksIncludedEndChefAccountCreated')}
                steps={chefSignUpSteps}
                showReachedColumn={showChefSignUpReachedColumn}
                reachedDisplay={(step) => (step.id === 'created' ? '-' : step.enteredCount)}
                dropOffForStep={sequentialDropOff}
                flow={chefSignUpFlow}
                tableAriaLabel={t(locale, 'admin', 'copy.chefSignUpSteps')}
                sankeyAriaLabel={t(locale, 'admin', 'copy.chefSignUpSankey')}
                emptyCopy={t(locale, 'admin', 'copy.noChefSignUpFunnelDataInTheSelectedRange')}
            >
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
            </AdminAnalyticsFunnelBlock>

            <AdminAnalyticsFunnelBlock
                title={t(locale, 'admin', 'copy.cookOfferFunnel')}
                description={t(locale, 'admin', 'copy.cohortCooksNotifiedInRangeExcludingAdminsDeclinedAndStartOff')}
                steps={cookSteps}
                showReachedColumn={showCookReachedColumn}
                reachedDisplay={(step) => (step.enteredCount > 0 ? step.enteredCount : '-')}
                dropOffForStep={cookDropOff}
                flow={cookOfferFlow}
                tableAriaLabel={t(locale, 'admin', 'copy.cookFunnelSteps')}
                sankeyAriaLabel={t(locale, 'admin', 'copy.cookOfferSankey')}
                emptyCopy={cookSankeyEmptyCopy}
            >
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <AdminOverviewStatCard label={t(locale, 'admin', 'copy.notified')} value={cookNotifiedCount} />
                    <AdminOverviewStatCard label={t(locale, 'admin', 'copy.opened')} value={cookOpenedCount} />
                    <AdminOverviewStatCard label={t(locale, 'admin', 'copy.declined')} value={cookDeclinedCount} />
                    <AdminOverviewStatCard label={t(locale, 'admin', 'copy.offersCreated')} value={cookOffersCreatedCount} />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.cookOfferMedianTimeToOffer')}
                        value={cookOfferFlow?.medianNotifyToOfferMinutes ?? 0}
                        displayValue={formatMedianHours(cookOfferFlow?.medianNotifyToOfferMinutes, locale)}
                    />
                </dl>
                {cookNotifiedCount > 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'analytics.cookConversion', { percent: cookConversionPercent ?? 0 })}
                    </p>
                ) : null}
            </AdminAnalyticsFunnelBlock>

            <AdminRelatedPageLinks
                links={[
                    {
                        to: adminUsersSectionTo('list'),
                        search: {
                            q: undefined,
                            type: 'cook',
                            status: undefined,
                            unapproved: undefined,
                            page: undefined,
                            sort: undefined,
                            dir: undefined,
                        },
                        label: t(locale, 'admin', 'analytics.tabs.cooks'),
                    },
                    {
                        to: '/{-$locale}/admin/traffic',
                        search: adminTrafficSearchForAnalyticsTab(range, 'cooks'),
                        label: t(locale, 'admin', 'nav.traffic.title'),
                    },
                ]}
            />
        </>
    );
}
