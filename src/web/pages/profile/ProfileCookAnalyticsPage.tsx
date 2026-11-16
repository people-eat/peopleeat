import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { t } from '../../../i18n/t';
import { formatCurrency } from '../../../shared';
import { Card, CardContent } from '../../components/base/card';
import { StatusAlert } from '../../components/base/status-alert';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCProfileCookAnalyticsFragment, GqlCProfileCookAnalyticsPageQuery } from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import {
    cookAnalyticsFormatAverageParticipants,
    cookAnalyticsFormatDurationMinutes,
    cookAnalyticsFormatMenuPrice,
    cookAnalyticsFormatPercent,
} from './cookAnalyticsFormat';
import { cookNavRouteBySlug } from './cookCatalog';
import {
    cookAnalyticsPeriodLabel,
    cookAnalyticsPeriods,
    parseProfileCookAnalyticsSearch,
    profileCookAnalyticsPeriodResolve,
} from './profileCookAnalyticsPeriod';
import type { ProfileCookAnalyticsSearch } from './profileCookAnalyticsPeriod';

const route = cookNavRouteBySlug('analytics');
export const profileCookAnalyticsPageTitle = route.title;
export const profileCookAnalyticsPageDescription = route.description;

export { parseProfileCookAnalyticsSearch };

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <Card className="min-w-0 gap-1 py-4">
            <CardContent className="grid min-w-0 gap-1 px-4">
                <dt className="min-w-0 hyphens-auto wrap-break-word text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {label}
                </dt>
                <dd className="font-serif text-3xl/tight tabular-nums text-foreground">{value}</dd>
            </CardContent>
        </Card>
    );
}

function AnalyticsSections({ analytics }: { analytics: GqlCProfileCookAnalyticsFragment }) {
    const locale = useLocale();

    return (
        <div className="grid gap-8">
            <section className="grid gap-3" aria-labelledby="cook-analytics-discovery">
                <h2 id="cook-analytics-discovery" className="text-sm font-medium text-foreground">
                    {t(locale, 'profileCook', 'analytics.discovery')}
                </h2>
                <dl className="grid gap-3 sm:grid-cols-2">
                    <StatCard label={t(locale, 'profileCook', 'analytics.profileViews')} value={String(analytics.publicProfileViewCount)} />
                </dl>
            </section>

            <section className="grid gap-3" aria-labelledby="cook-analytics-responsiveness">
                <h2 id="cook-analytics-responsiveness" className="text-sm font-medium text-foreground">
                    {t(locale, 'profileCook', 'analytics.responsiveness')}
                </h2>
                <dl className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3')}>
                    <StatCard label={t(locale, 'profileCook', 'analytics.notified')} value={String(analytics.requestsNotifiedCount)} />
                    <StatCard label={t(locale, 'profileCook', 'analytics.opened')} value={String(analytics.requestsOpenedCount)} />
                    <StatCard label={t(locale, 'profileCook', 'analytics.declined')} value={String(analytics.requestsDeclinedCount)} />
                    <StatCard
                        label={t(locale, 'profileCook', 'analytics.openRate')}
                        value={cookAnalyticsFormatPercent(analytics.openRate, locale)}
                    />
                    <StatCard
                        label={t(locale, 'profileCook', 'analytics.declineRate')}
                        value={cookAnalyticsFormatPercent(analytics.declineRate, locale)}
                    />
                    <StatCard
                        label={t(locale, 'profileCook', 'analytics.offerCreateRate')}
                        value={cookAnalyticsFormatPercent(analytics.offerCreateRate, locale)}
                    />
                    <StatCard
                        label={t(locale, 'profileCook', 'analytics.timeToOpen')}
                        value={cookAnalyticsFormatDurationMinutes(analytics.medianNotifyToOpenMinutes, locale)}
                    />
                    <StatCard
                        label={t(locale, 'profileCook', 'analytics.timeToOffer')}
                        value={cookAnalyticsFormatDurationMinutes(analytics.medianNotifyToOfferMinutes, locale)}
                    />
                </dl>
            </section>

            <section className="grid gap-3" aria-labelledby="cook-analytics-offers">
                <h2 id="cook-analytics-offers" className="text-sm font-medium text-foreground">
                    {t(locale, 'profileCook', 'analytics.offersAndBookings')}
                </h2>
                <dl className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3')}>
                    <StatCard label={t(locale, 'profileCook', 'analytics.offersCreated')} value={String(analytics.offersCreatedCount)} />
                    <StatCard label={t(locale, 'profileCook', 'analytics.accepted')} value={String(analytics.offersAcceptedCount)} />
                    <StatCard
                        label={t(locale, 'profileCook', 'analytics.conversion')}
                        value={cookAnalyticsFormatPercent(analytics.offerConversionRate, locale)}
                    />
                    <StatCard label={t(locale, 'profileCook', 'analytics.paid')} value={String(analytics.offersPaidCount)} />
                    <StatCard
                        label={t(locale, 'profileCook', 'analytics.payoutTotal')}
                        value={formatCurrency(analytics.paidPayoutCentsCookTotal, { locale, maximumFractionDigits: 0 })}
                    />
                    <StatCard
                        label={t(locale, 'profileCook', 'analytics.avgMenuPrice')}
                        value={cookAnalyticsFormatMenuPrice(analytics.averageMenuPriceCents, locale)}
                    />
                    <StatCard
                        label={t(locale, 'profileCook', 'analytics.avgParticipants')}
                        value={cookAnalyticsFormatAverageParticipants(analytics.averageParticipants, locale)}
                    />
                </dl>
            </section>
        </div>
    );
}

export function ProfileCookAnalyticsPage({
    data,
    search,
}: {
    data: GqlCProfileCookAnalyticsPageQuery;
    search: ProfileCookAnalyticsSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/profile/analytics' });
    const analyticsEnabled = useFeatureToggleActive('COOK_ANALYTICS');
    const period = profileCookAnalyticsPeriodResolve(search);
    const analytics = data.currentSession.user?.cook?.analytics ?? null;

    useEffect(() => {
        if (!analyticsEnabled || analytics == null) {
            void navigate({ to: '/{-$locale}/profile', replace: true });
        }
    }, [analytics, analyticsEnabled, navigate]);

    if (!analyticsEnabled || analytics == null) {
        return null;
    }

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-4xl content-start gap-8">
            <div className="grid gap-2">
                <h1 className="font-serif text-2xl/tight text-foreground">{profileCookAnalyticsPageTitle(locale)}</h1>
                <p className="text-muted-foreground">{profileCookAnalyticsPageDescription(locale)}</p>
            </div>

            <Tabs
                value={period}
                onValueChange={(value) => {
                    const next = profileCookAnalyticsPeriodResolve({
                        period: value as ProfileCookAnalyticsSearch['period'],
                    });
                    void navigate({
                        search: next === 'PAST_MONTH' ? {} : { period: next },
                        replace: true,
                    });
                }}
            >
                <TabsList aria-label={t(locale, 'profileCook', 'period.label')}>
                    {cookAnalyticsPeriods.map((entry) => (
                        <TabsTrigger key={entry} value={entry}>
                            {cookAnalyticsPeriodLabel(entry, locale)}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {!analytics.hasInsights ? (
                <StatusAlert tone="info" title={t(locale, 'profileCook', 'analytics.emptyTitle')}>
                    {t(locale, 'profileCook', 'analytics.emptyBody')}
                </StatusAlert>
            ) : (
                <AnalyticsSections analytics={analytics} />
            )}
        </main>
    );
}
