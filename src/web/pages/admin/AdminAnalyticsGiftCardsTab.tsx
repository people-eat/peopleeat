import { t } from '../../../i18n/t';
import type { GqlCAdminAnalyticsPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { AdminAnalyticsFunnelBlock, sequentialDropOff } from './AdminAnalyticsFunnelBlock';
import { adminTrafficSearchForAnalyticsTab } from './adminAnalyticsSearch';
import type { AdminOverviewDateRange } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { AdminRelatedPageLinks } from './AdminRelatedPageLink';

type AdminAnalyticsAdmin = NonNullable<NonNullable<GqlCAdminAnalyticsPageQuery['currentSession']['user']>['admin']>;

export function AdminAnalyticsGiftCardsTab({ admin, range }: { admin: AdminAnalyticsAdmin; range: AdminOverviewDateRange }) {
    const locale = useLocale();
    const giftCardFlow = admin.giftCardFlow;
    const giftCardSteps = giftCardFlow?.steps ?? [];
    const giftCardStepsWithActivity = giftCardSteps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const showGiftCardReachedColumn = giftCardStepsWithActivity.some(
        (step) => step.enteredCount > 0 && step.id !== 'created' && step.id !== 'paid',
    );
    const giftCardVisitCount = (admin.giftCardVisits ?? []).reduce((sum, bucket) => sum + bucket.count, 0);
    const giftCardPaidCount = giftCardSteps.find((step) => step.id === 'paid')?.completedCount ?? 0;
    const visitToPaidPercent = giftCardVisitCount > 0 ? Math.round((giftCardPaidCount / giftCardVisitCount) * 100) : null;

    return (
        <>
            <section className="grid gap-3">
                <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.overview')}</h2>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.giftCards.visits')}
                        value={giftCardVisitCount}
                        to="/{-$locale}/admin/traffic"
                        search={adminTrafficSearchForAnalyticsTab(range, 'gift-cards')}
                    />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'analytics.giftCards.visitToPaid')}
                        value={visitToPaidPercent ?? 0}
                        displayValue={visitToPaidPercent == null ? t(locale, 'admin', 'copy.nA') : `${visitToPaidPercent}\u00a0%`}
                    />
                </dl>
            </section>
            <AdminAnalyticsFunnelBlock
                title={t(locale, 'admin', 'copy.giftCardFunnel')}
                description={t(locale, 'admin', 'copy.humanNonAdminNonCookSessionsEndGiftCardPaid')}
                steps={giftCardSteps}
                showReachedColumn={showGiftCardReachedColumn}
                reachedDisplay={(step) => (step.id === 'created' || step.id === 'paid' ? '-' : step.enteredCount)}
                dropOffForStep={sequentialDropOff}
                flow={giftCardFlow}
                tableAriaLabel={t(locale, 'admin', 'copy.giftCardSteps')}
                sankeyAriaLabel={t(locale, 'admin', 'copy.giftCardSankey')}
                emptyCopy={t(locale, 'admin', 'copy.noGiftCardFunnelDataInTheSelectedRange')}
            >
                <dl className="grid gap-3 sm:grid-cols-2">
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'copy.sessionsWithCompletion')}
                        value={giftCardFlow?.sessionsWithCompletion ?? 0}
                    />
                    <AdminOverviewStatCard
                        label={t(locale, 'admin', 'copy.paid')}
                        value={giftCardSteps.find((step) => step.id === 'paid')?.completedCount ?? 0}
                    />
                </dl>
            </AdminAnalyticsFunnelBlock>
            <AdminRelatedPageLinks
                links={[
                    {
                        to: '/{-$locale}/admin/gift-cards',
                        search: { from: range.from, to: range.to },
                        label: t(locale, 'admin', 'nav.giftCards.title'),
                    },
                    {
                        to: '/{-$locale}/admin/traffic',
                        search: adminTrafficSearchForAnalyticsTab(range, 'gift-cards'),
                        label: t(locale, 'admin', 'nav.traffic.title'),
                    },
                ]}
            />
        </>
    );
}
