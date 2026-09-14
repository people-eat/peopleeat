import { Link } from '@tanstack/react-router';

import { Button } from '../components/base/button';
import { StatusAlert } from '../components/base/status-alert';
import type { CustomerBookingRequestCardAttention } from '../components/CustomerBookingRequestCard';
import { CustomerBookingRequestCard } from '../components/CustomerBookingRequestCard';
import type { GqlCProfilePageUserFragment } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import type { CustomerOverviewAttentionItem, CustomerOverviewGettingStartedStep } from './profilePageCustomerOverview';
import { profilePageCustomerOverview } from './profilePageCustomerOverview';

function AttentionAction({ item }: { item: CustomerOverviewAttentionItem }) {
    if (item.target.kind === 'requests') {
        return (
            <Button asChild size="sm">
                <Link to="/{-$locale}/profile/booking-requests">{item.actionLabel}</Link>
            </Button>
        );
    }
    if (item.target.kind === 'request') {
        return (
            <Button asChild size="sm">
                <Link
                    to="/{-$locale}/profile/booking-requests/$bookingRequestId"
                    params={{ bookingRequestId: item.target.bookingRequestId }}
                >
                    {item.actionLabel}
                </Link>
            </Button>
        );
    }
    if (item.target.kind === 'checkout') {
        return (
            <Button asChild size="sm">
                <Link
                    to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/checkout"
                    params={{
                        bookingRequestId: item.target.bookingRequestId,
                        bookingRequestOfferId: item.target.bookingRequestOfferId,
                    }}
                >
                    {item.actionLabel}
                </Link>
            </Button>
        );
    }
    return (
        <Button asChild size="sm">
            <Link
                to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                params={{
                    bookingRequestId: item.target.bookingRequestId,
                    bookingRequestOfferId: item.target.bookingRequestOfferId,
                }}
                search={item.target.search}
            >
                {item.actionLabel}
            </Link>
        </Button>
    );
}

function GettingStartedAction({ step }: { step: CustomerOverviewGettingStartedStep }) {
    return (
        <Button asChild variant="outline" size="sm" className="sm:shrink-0">
            <Link to={step.href}>{step.actionLabel}</Link>
        </Button>
    );
}

function attentionBadgeLabel(item: CustomerOverviewAttentionItem, locale: 'de' | 'en'): string {
    switch (item.key) {
        case 'offers-to-review':
            return { de: 'Entscheidung', en: 'Decision' }[locale];
        case 'payment-due':
            return { de: 'Zahlung', en: 'Payment' }[locale];
        case 'unread-offers':
            return { de: 'Nachricht', en: 'Message' }[locale];
        case 'upcoming-call':
            return { de: 'Termin', en: 'Call' }[locale];
        case 'review-missing':
            return { de: 'Bewertung', en: 'Review' }[locale];
    }
}

function cardAttentionFromOverview(item: CustomerOverviewAttentionItem, locale: 'de' | 'en'): CustomerBookingRequestCardAttention | null {
    const badgeLabel = attentionBadgeLabel(item, locale);
    if (item.target.kind === 'requests') return null;
    if (item.target.kind === 'request') {
        return {
            tone: item.tone,
            badgeLabel,
            actionLabel: item.actionLabel,
            destination: {
                to: '/{-$locale}/profile/booking-requests/$bookingRequestId',
                params: { bookingRequestId: item.target.bookingRequestId },
            },
        };
    }
    if (item.target.kind === 'checkout') {
        return {
            tone: item.tone,
            badgeLabel,
            actionLabel: item.actionLabel,
            destination: {
                to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/checkout',
                params: {
                    bookingRequestId: item.target.bookingRequestId,
                    bookingRequestOfferId: item.target.bookingRequestOfferId,
                },
            },
        };
    }
    return {
        tone: item.tone,
        badgeLabel,
        actionLabel: item.actionLabel,
        destination: {
            to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
            params: {
                bookingRequestId: item.target.bookingRequestId,
                bookingRequestOfferId: item.target.bookingRequestOfferId,
            },
            search: item.target.search,
        },
    };
}

export function ProfilePageCustomer({ name, user }: { name: string; user: GqlCProfilePageUserFragment }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const overview = profilePageCustomerOverview(user.bookingRequests ?? [], locale, timeZone);
    const showGettingStarted = overview.createMode !== 'primary' && overview.gettingStarted.length > 0;
    const nextDinner = overview.nextDinner;
    const inlineAttention = nextDinner?.inlineAttention ?? null;
    const nextDinnerRequest =
        nextDinner == null
            ? null
            : ((user.bookingRequests ?? []).find((request) => request.bookingRequestId === nextDinner.bookingRequestId) ?? null);
    const nextDinnerCardAttention = inlineAttention == null ? undefined : (cardAttentionFromOverview(inlineAttention, locale) ?? undefined);

    return (
        <main id="main-content" className="mx-auto grid min-h-0 w-full max-w-3xl flex-1 content-start gap-8">
            <div className="grid gap-2">
                <h1 className="font-serif text-2xl/tight text-foreground">{{ de: `Hallo ${name},`, en: `Hello ${name},` }[locale]}</h1>
                <p className="text-muted-foreground">
                    {{ de: 'Hier siehst du, was als Nächstes ansteht.', en: 'Here is what to do next.' }[locale]}
                </p>
            </div>

            {overview.attention.length > 0 ? (
                <section className="grid gap-3" aria-labelledby="customer-overview-attention">
                    <h2 id="customer-overview-attention" className="text-sm font-medium text-foreground">
                        {{ de: 'Aufmerksamkeit', en: 'Attention' }[locale]}
                    </h2>
                    <div className="grid gap-3">
                        {overview.attention.map((item) => (
                            <StatusAlert key={item.key} tone={item.tone} title={item.title} action={<AttentionAction item={item} />}>
                                {item.body}
                            </StatusAlert>
                        ))}
                    </div>
                </section>
            ) : null}

            {overview.createMode === 'primary' ? (
                <StatusAlert
                    tone="info"
                    title={{ de: 'Dein erstes Dinner bei dir?', en: 'Your first dinner at home?' }[locale]}
                    action={
                        <Button asChild size="sm">
                            <Link to="/{-$locale}/booking-request/form">
                                {{ de: 'Buchungsanfrage starten', en: 'Start a booking request' }[locale]}
                            </Link>
                        </Button>
                    }
                >
                    {
                        {
                            de: 'Erzähl uns von Anlass, Termin und Gästen. Wir finden den passenden Koch.',
                            en: 'Tell us the occasion, date, and guests. We’ll find the right chef.',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            {overview.createMode === 'secondary' ? (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="grid gap-1">
                        <p className="font-medium text-foreground">
                            {{ de: 'Schon den nächsten Anlass im Blick?', en: 'Already eyeing the next occasion?' }[locale]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Geburtstag, Abend mit Freunden oder Team-Event: starte eine neue Anfrage, sobald der Termin feststeht.',
                                    en: 'Birthday, friends’ night, or team event: start a new request as soon as the date is set.',
                                }[locale]
                            }
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                        <Link to="/{-$locale}/booking-request/form">
                            {{ de: 'Neue Buchungsanfrage', en: 'New booking request' }[locale]}
                        </Link>
                    </Button>
                </div>
            ) : null}

            {nextDinner != null && nextDinnerRequest != null ? (
                <section className="grid gap-3" aria-labelledby="customer-overview-next-dinner">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="customer-overview-next-dinner" className="text-sm font-medium text-foreground">
                            {{ de: 'Nächstes Dinner', en: 'Next dinner' }[locale]}
                        </h2>
                        {nextDinner.activeRequestCount > 1 ? (
                            <Button asChild variant="ghost" size="sm">
                                <Link to="/{-$locale}/profile/booking-requests">{{ de: 'Alle ansehen', en: 'View all' }[locale]}</Link>
                            </Button>
                        ) : null}
                    </div>
                    <CustomerBookingRequestCard request={nextDinnerRequest} attention={nextDinnerCardAttention} />
                </section>
            ) : null}

            {showGettingStarted ? (
                <section className="grid gap-3" aria-labelledby="customer-overview-getting-started">
                    <h2 id="customer-overview-getting-started" className="text-sm font-medium text-foreground">
                        {{ de: 'Erste Schritte', en: 'Getting started' }[locale]}
                    </h2>
                    <ul className="grid gap-3">
                        {overview.gettingStarted.map((step) => (
                            <li
                                key={step.key}
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
                            de: 'Gerade brauchst du nichts zu tun. Nutze die Seitenleiste für Anfragen und Support.',
                            en: 'Nothing needs you right now. Use the sidebar for requests and support.',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}
        </main>
    );
}
