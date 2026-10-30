import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';

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
    if (action.to === '/{-$locale}/profile/wallet') {
        return (
            <Button asChild size="sm">
                <Link to={action.to}>{action.label}</Link>
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
            label: { de: 'Profilbesuche', en: 'Profile views' }[locale],
            value: String(analytics.publicProfileViewCount),
        },
        {
            key: 'response',
            label: { de: 'Zeit bis Öffnen', en: 'Time to open' }[locale],
            value: cookAnalyticsFormatDurationMinutes(analytics.medianNotifyToOpenMinutes, locale),
        },
        {
            key: 'offers',
            label: { de: 'Angebote', en: 'Offers' }[locale],
            value: String(analytics.offersCreatedCount),
        },
        {
            key: 'conversion',
            label: { de: 'Conversion', en: 'Conversion' }[locale],
            value: cookAnalyticsFormatPercent(analytics.offerConversionRate, locale),
        },
    ] as const;

    return (
        <section className="grid gap-3" aria-labelledby="cook-overview-analytics">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="cook-overview-analytics" className="text-sm font-medium text-foreground">
                    {{ de: 'Analysen', en: 'Analytics' }[locale]}
                </h2>
                <p className="text-xs text-muted-foreground">{{ de: 'Vergangener Monat', en: 'Past month' }[locale]}</p>
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
                        {{ de: 'Alle Analysen', en: 'View all analytics' }[locale]}
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
        <main id="main-content" className="mx-auto grid min-h-0 w-full max-w-3xl flex-1 content-start gap-8">
            <div className="grid gap-2">
                <h1 className="font-serif text-2xl/tight text-foreground">{{ de: `Hallo ${name},`, en: `Hello ${name},` }[locale]}</h1>
                <p className="text-muted-foreground">
                    {{ de: 'Hier siehst du, was als Nächstes ansteht.', en: 'Here is what to do next.' }[locale]}
                </p>
            </div>

            {overview.attention.length > 0 ? (
                <section className="grid gap-3" aria-labelledby="cook-overview-attention">
                    <h2 id="cook-overview-attention" className="text-sm font-medium text-foreground">
                        {{ de: 'Aufmerksamkeit', en: 'Attention' }[locale]}
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
                        {{ de: 'Erste Schritte', en: 'Getting started' }[locale]}
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
                <StatusAlert tone="info" title={{ de: 'Alles erledigt', en: "You're all set" }[locale]}>
                    {
                        {
                            de: 'Dein Profil ist eingerichtet. Nutze die Seitenleiste für Anfragen und Angebote.',
                            en: 'Your profile is set up. Use the sidebar for requests and offers.',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}
        </main>
    );
}
