import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';

import { t } from '../../i18n/t';
import { Button } from '../components/base/button';
import { Card, CardContent } from '../components/base/card';
import { StatusAlert } from '../components/base/status-alert';
import type { GqlCProfilePageCookStatusFragment } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cookAnalyticsFormatDurationMinutes, cookAnalyticsFormatPercent } from './profile/cookAnalyticsFormat';
import type { CookOverviewAttentionItem, CookOverviewGettingStartedStep } from './profilePageCookOverview';
import { profilePageCookOverview } from './profilePageCookOverview';

function AttentionAction({ action }: { action: NonNullable<CookOverviewAttentionItem['action']> }) {
    if (action.to === '/{-$locale}/profile/wallet' || action.to === '/{-$locale}/profile/booking-request-pool') {
        return (
            <Button asChild size="sm">
                <Link to={action.to}>{action.label}</Link>
            </Button>
        );
    }
    if (action.to === '/{-$locale}/profile/booking-request-pool/$bookingRequestId') {
        return (
            <Button asChild size="sm">
                <Link to={action.to} params={{ bookingRequestId: action.bookingRequestId }}>
                    {action.label}
                </Link>
            </Button>
        );
    }
    return (
        <Button asChild size="sm">
            <Link to={action.to} params={{ bookingRequestOfferId: action.bookingRequestOfferId }} search={action.search}>
                {action.label}
            </Link>
        </Button>
    );
}

function GettingStartedAction({ step }: { step: CookOverviewGettingStartedStep }) {
    return (
        <Button asChild variant="outline" size="sm" className="sm:shrink-0">
            <Link to={step.href}>{step.actionLabel}</Link>
        </Button>
    );
}

function OverviewAnalyticsStrip({ cook }: { cook: GqlCProfilePageCookStatusFragment }) {
    const locale = useLocale();
    const analytics = cook.analytics;
    if (analytics == null || !analytics.hasInsights) {
        return null;
    }

    const stats = [
        {
            key: 'views',
            label: t(locale, 'profileCook', 'analytics.profileViews'),
            value: String(analytics.publicProfileViewCount),
        },
        {
            key: 'response',
            label: t(locale, 'profileCook', 'analytics.timeToOpen'),
            value: cookAnalyticsFormatDurationMinutes(analytics.medianNotifyToOpenMinutes, locale),
        },
        {
            key: 'offers',
            label: t(locale, 'profileCook', 'overview.metricOffers'),
            value: String(analytics.offersCreatedCount),
        },
        {
            key: 'conversion',
            label: t(locale, 'profileCook', 'analytics.conversion'),
            value: cookAnalyticsFormatPercent(analytics.offerConversionRate, locale),
        },
    ] as const;

    return (
        <section className="grid gap-3" aria-labelledby="cook-overview-analytics">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="cook-overview-analytics" className="text-sm font-medium text-foreground">
                    {t(locale, 'profileCook', 'nav.analytics.title')}
                </h2>
                <p className="text-xs text-muted-foreground">{t(locale, 'profileCook', 'overview.pastMonth')}</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
                {stats.map((stat) => (
                    <Card key={stat.key} className="min-w-0 gap-1 py-3">
                        <CardContent className="grid min-w-0 gap-1 px-4">
                            <dt className="min-w-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">{stat.label}</dt>
                            <dd className="font-serif text-2xl/tight tabular-nums text-foreground">{stat.value}</dd>
                        </CardContent>
                    </Card>
                ))}
            </dl>
            <div>
                <Button asChild variant="outline" size="sm">
                    <Link to="/{-$locale}/profile/analytics">
                        {t(locale, 'profileCook', 'overview.viewAllAnalytics')}
                        <ChevronRightIcon aria-hidden />
                    </Link>
                </Button>
            </div>
        </section>
    );
}

export function ProfilePageCook({ name, cook }: { name: string; cook: GqlCProfilePageCookStatusFragment }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const overview = profilePageCookOverview(cook, locale, timeZone);

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-3xl content-start gap-8">
            <div className="grid gap-2">
                <h1 className="font-serif text-2xl/tight text-foreground">{t(locale, 'profile', 'overview.hello', { name })}</h1>
                <p className="text-muted-foreground">{t(locale, 'profile', 'overview.subtitle')}</p>
            </div>

            {overview.attention.length > 0 ? (
                <section className="grid gap-3" aria-labelledby="cook-overview-attention">
                    <h2 id="cook-overview-attention" className="text-sm font-medium text-foreground">
                        {t(locale, 'profile', 'overview.attention')}
                    </h2>
                    <div className="grid gap-3">
                        {overview.attention.map((item) => (
                            <StatusAlert
                                key={item.kind}
                                tone={item.tone}
                                title={item.title}
                                action={item.action != null ? <AttentionAction action={item.action} /> : undefined}
                            >
                                {item.body}
                            </StatusAlert>
                        ))}
                    </div>
                </section>
            ) : null}

            <OverviewAnalyticsStrip cook={cook} />

            {overview.gettingStarted.length > 0 ? (
                <section className="grid gap-3" aria-labelledby="cook-overview-getting-started">
                    <h2 id="cook-overview-getting-started" className="text-sm font-medium text-foreground">
                        {t(locale, 'profile', 'overview.gettingStarted')}
                    </h2>
                    <ul className="grid gap-3">
                        {overview.gettingStarted.map((step) => (
                            <li
                                key={step.step}
                                className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-start sm:justify-between"
                            >
                                <div className="grid gap-1">
                                    <p className="font-medium text-foreground">{step.title}</p>
                                    <p className="text-sm text-muted-foreground">{step.body}</p>
                                </div>
                                <GettingStartedAction step={step} />
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {overview.allClear ? (
                <StatusAlert tone="info" title={t(locale, 'profile', 'overview.allSet')}>
                    {t(locale, 'profileCook', 'overview.allSetBody')}
                </StatusAlert>
            ) : null}
        </main>
    );
}
