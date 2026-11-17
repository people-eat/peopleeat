import { Link } from '@tanstack/react-router';

import { t } from '../../i18n/t';
import type { Locale } from '../../shared';
import { userAttentionKindBadgeLabel } from '../../shared/attentionCopy';
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

function cardAttentionFromOverview(item: CustomerOverviewAttentionItem, locale: Locale): CustomerBookingRequestCardAttention | null {
    const badgeLabel = userAttentionKindBadgeLabel(item.kind, locale);
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
    const overview = profilePageCustomerOverview(user.bookingRequests ?? [], user.attention ?? [], locale, timeZone);
    const showGettingStarted = overview.createMode !== 'primary' && overview.gettingStarted.length > 0;
    const nextDinner = overview.nextDinner;
    const inlineAttention = nextDinner?.inlineAttention ?? null;
    const nextDinnerRequest =
        nextDinner == null
            ? null
            : ((user.bookingRequests ?? []).find((request) => request.bookingRequestId === nextDinner.bookingRequestId) ?? null);
    const nextDinnerCardAttention = inlineAttention == null ? undefined : (cardAttentionFromOverview(inlineAttention, locale) ?? undefined);

    return (
        <main id="main-content" className="@container mx-auto grid w-full max-w-3xl content-start gap-8">
            <div className="grid gap-2">
                <h1 className="font-serif text-2xl/tight text-foreground">{t(locale, 'profile', 'overview.hello', { name })}</h1>
                <p className="text-muted-foreground">{t(locale, 'profile', 'overview.subtitle')}</p>
            </div>

            {overview.attention.length > 0 ? (
                <section className="grid gap-3" aria-labelledby="customer-overview-attention">
                    <h2 id="customer-overview-attention" className="text-sm font-medium text-foreground">
                        {t(locale, 'profile', 'overview.attention')}
                    </h2>
                    <div className="grid gap-3">
                        {overview.attention.map((item) => (
                            <StatusAlert key={item.kind} tone={item.tone} title={item.title} action={<AttentionAction item={item} />}>
                                {item.body}
                            </StatusAlert>
                        ))}
                    </div>
                </section>
            ) : null}

            {overview.createMode === 'primary' ? (
                <StatusAlert
                    tone="info"
                    title={t(locale, 'profileCustomer', 'bookingRequests.emptyTitle')}
                    action={
                        <Button asChild size="sm">
                            <Link to="/{-$locale}/booking-request/form">{t(locale, 'profileCustomer', 'overview.startRequest')}</Link>
                        </Button>
                    }
                >
                    {t(locale, 'profileCustomer', 'overview.startRequestBody')}
                </StatusAlert>
            ) : null}

            {overview.createMode === 'secondary' ? (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="grid gap-1">
                        <p className="font-medium text-foreground">{t(locale, 'profileCustomer', 'overview.nextOccasionTitle')}</p>
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCustomer', 'overview.nextOccasionBody')}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                        <Link to="/{-$locale}/booking-request/form">{t(locale, 'profileCustomer', 'overview.newRequest')}</Link>
                    </Button>
                </div>
            ) : null}

            {nextDinner != null && nextDinnerRequest != null ? (
                <section className="grid gap-3" aria-labelledby="customer-overview-next-dinner">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="customer-overview-next-dinner" className="text-sm font-medium text-foreground">
                            {t(locale, 'profileCustomer', 'overview.nextDinner')}
                        </h2>
                        {nextDinner.activeRequestCount > 1 ? (
                            <Button asChild variant="ghost" size="sm">
                                <Link to="/{-$locale}/profile/booking-requests">{t(locale, 'profileCustomer', 'overview.viewAll')}</Link>
                            </Button>
                        ) : null}
                    </div>
                    <ul className="grid auto-rows-fr grid-cols-1 items-stretch gap-4 @md:grid-cols-2 @2xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5 @8xl:grid-cols-6">
                        <li className="grid min-h-0 min-w-0">
                            <CustomerBookingRequestCard request={nextDinnerRequest} attention={nextDinnerCardAttention} />
                        </li>
                    </ul>
                </section>
            ) : null}

            {showGettingStarted ? (
                <section className="grid gap-3" aria-labelledby="customer-overview-getting-started">
                    <h2 id="customer-overview-getting-started" className="text-sm font-medium text-foreground">
                        {t(locale, 'profile', 'overview.gettingStarted')}
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
                <StatusAlert tone="info" title={t(locale, 'profile', 'overview.allSet')}>
                    {t(locale, 'profileCustomer', 'overview.allSetBody')}
                </StatusAlert>
            ) : null}
        </main>
    );
}
