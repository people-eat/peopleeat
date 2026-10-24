import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

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
                    {{ de: 'Entdeckung', en: 'Discovery' }[locale]}
                </h2>
                <dl className="grid gap-3 sm:grid-cols-2">
                    <StatCard
                        label={{ de: 'Profilbesuche', en: 'Profile views' }[locale]}
                        value={String(analytics.publicProfileViewCount)}
                    />
                </dl>
            </section>

            <section className="grid gap-3" aria-labelledby="cook-analytics-responsiveness">
                <h2 id="cook-analytics-responsiveness" className="text-sm font-medium text-foreground">
                    {{ de: 'Reaktionszeit', en: 'Responsiveness' }[locale]}
                </h2>
                <dl className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3')}>
                    <StatCard label={{ de: 'Benachrichtigt', en: 'Notified' }[locale]} value={String(analytics.requestsNotifiedCount)} />
                    <StatCard label={{ de: 'Geöffnet', en: 'Opened' }[locale]} value={String(analytics.requestsOpenedCount)} />
                    <StatCard label={{ de: 'Abgelehnt', en: 'Declined' }[locale]} value={String(analytics.requestsDeclinedCount)} />
                    <StatCard
                        label={{ de: 'Öffnungsrate', en: 'Open rate' }[locale]}
                        value={cookAnalyticsFormatPercent(analytics.openRate, locale)}
                    />
                    <StatCard
                        label={{ de: 'Ablehnungsrate', en: 'Decline rate' }[locale]}
                        value={cookAnalyticsFormatPercent(analytics.declineRate, locale)}
                    />
                    <StatCard
                        label={{ de: 'Angebotsrate', en: 'Offer create rate' }[locale]}
                        value={cookAnalyticsFormatPercent(analytics.offerCreateRate, locale)}
                    />
                    <StatCard
                        label={{ de: 'Zeit bis Öffnen', en: 'Time to open' }[locale]}
                        value={cookAnalyticsFormatDurationMinutes(analytics.medianNotifyToOpenMinutes, locale)}
                    />
                    <StatCard
                        label={{ de: 'Zeit bis Angebot', en: 'Time to offer' }[locale]}
                        value={cookAnalyticsFormatDurationMinutes(analytics.medianNotifyToOfferMinutes, locale)}
                    />
                </dl>
            </section>

            <section className="grid gap-3" aria-labelledby="cook-analytics-offers">
                <h2 id="cook-analytics-offers" className="text-sm font-medium text-foreground">
                    {{ de: 'Angebote und Buchungen', en: 'Offers and bookings' }[locale]}
                </h2>
                <dl className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3')}>
                    <StatCard
                        label={{ de: 'Angebote erstellt', en: 'Offers created' }[locale]}
                        value={String(analytics.offersCreatedCount)}
                    />
                    <StatCard label={{ de: 'Angenommen', en: 'Accepted' }[locale]} value={String(analytics.offersAcceptedCount)} />
                    <StatCard
                        label={{ de: 'Conversion', en: 'Conversion' }[locale]}
                        value={cookAnalyticsFormatPercent(analytics.offerConversionRate, locale)}
                    />
                    <StatCard label={{ de: 'Bezahlt', en: 'Paid' }[locale]} value={String(analytics.offersPaidCount)} />
                    <StatCard
                        label={{ de: 'Auszahlung gesamt', en: 'Payout total' }[locale]}
                        value={formatCurrency(analytics.paidPayoutCentsCookTotal, { locale, maximumFractionDigits: 0 })}
                    />
                    <StatCard
                        label={{ de: 'Ø Menüpreis', en: 'Avg. menu price' }[locale]}
                        value={cookAnalyticsFormatMenuPrice(analytics.averageMenuPriceCents, locale)}
                    />
                    <StatCard
                        label={{ de: 'Ø Teilnehmer', en: 'Avg. participants' }[locale]}
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
                <h1 className="font-serif text-2xl/tight text-foreground">{profileCookAnalyticsPageTitle[locale]}</h1>
                <p className="text-muted-foreground">{profileCookAnalyticsPageDescription[locale]}</p>
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
                <TabsList aria-label={{ de: 'Zeitraum', en: 'Time period' }[locale]}>
                    {cookAnalyticsPeriods.map((entry) => (
                        <TabsTrigger key={entry} value={entry}>
                            {cookAnalyticsPeriodLabel(entry, locale)}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {!analytics.hasInsights ? (
                <StatusAlert tone="info" title={{ de: 'Noch keine Daten', en: 'No insights yet' }[locale]}>
                    {
                        {
                            de: 'Sobald Anfragen in deinem Pool landen oder Gäste dein öffentliches Profil besuchen, erscheinen hier Auswertungen.',
                            en: 'Once requests reach your pool or guests visit your public profile, insights will show up here.',
                        }[locale]
                    }
                </StatusAlert>
            ) : (
                <AnalyticsSections analytics={analytics} />
            )}
        </main>
    );
}
