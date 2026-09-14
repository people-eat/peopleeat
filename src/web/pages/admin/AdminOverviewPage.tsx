import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatCurrency, formatDate, formatDateTime, userDisplayName } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { StatusAlert } from '../../components/base/status-alert';
import type {
    GqlCAdminCookPayoutBlockedReason,
    GqlCAdminOverviewPageAdminFragment,
    GqlCAdminOverviewPageQuery,
} from '../../graphql/generated';
import { AdminOverviewPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { adminOverviewLinkCardChevronClassName, adminOverviewLinkCardClassName } from './adminOverviewLinkCard';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { adminUsersSectionTo } from './adminUsers';

export const adminOverviewPageTitle = { de: 'Übersicht', en: 'Overview' } as const;

const PENDING_COOKS_TAKE = 5;
const BLOCKED_BOOKING_REQUESTS_TAKE = 5;
const DUE_PAYOUT_OFFERS_TAKE = 5;
const OPEN_SUPPORT_REQUESTS_TAKE = 5;
const PENDING_OFFER_CHAT_REVIEWS_TAKE = 5;

export function adminOverviewPageVariables() {
    return {
        pendingCooks: {
            skip: 0,
            take: PENDING_COOKS_TAKE,
            types: ['cook' as const],
            isApprovedByAdmin: false,
        },
        blockedBookingRequests: {
            skip: 0,
            take: BLOCKED_BOOKING_REQUESTS_TAKE,
            publicationStatuses: ['PUBLICATION_BLOCKED_BY_ADMIN_REVIEW' as const],
        },
        duePayoutOffers: {
            skip: 0,
            take: DUE_PAYOUT_OFFERS_TAKE,
            paymentStatuses: ['PAYED' as const],
            plannedPayoutDateTimeTo: new Date().toISOString(),
        },
        openSupportRequests: {
            skip: 0,
            take: OPEN_SUPPORT_REQUESTS_TAKE,
            statuses: ['OPEN' as const],
        },
        pendingOfferChatReviews: {
            skip: 0,
            take: PENDING_OFFER_CHAT_REVIEWS_TAKE,
            hasAdminChatReviewPending: true as const,
        },
    };
}

function cookPayoutBlockedReasonLabel(reason: GqlCAdminCookPayoutBlockedReason | null | undefined, locale: Locale): string | null {
    if (reason == null) return null;
    return {
        MISSING_STRIPE_ACCOUNT: { de: 'Kein Stripe-Konto', en: 'No Stripe account' },
        STRIPE_ACCOUNT_INACTIVE: { de: 'Stripe inaktiv', en: 'Stripe inactive' },
        STRIPE_PAYOUTS_DISABLED: { de: 'Auszahlungen deaktiviert', en: 'Payouts disabled' },
    }[reason][locale];
}

function AdminOverviewQueueSection({
    headingId,
    title,
    viewAll,
    children,
}: {
    headingId: string;
    title: string;
    viewAll?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-3" aria-labelledby={headingId}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 id={headingId} className="text-lg font-medium">
                    {title}
                </h3>
                {viewAll}
            </div>
            {children}
        </section>
    );
}

function AdminOverviewQueueItemLink({
    to,
    params,
    search,
    title,
    detail,
}: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    title: string;
    detail: string;
}) {
    return (
        <Link to={to} params={params} search={search} className={adminOverviewLinkCardClassName('flex items-center gap-3 px-4 py-3')}>
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-medium text-foreground">{title}</span>
                <span className="truncate text-sm text-muted-foreground">{detail}</span>
            </span>
            <ChevronRightIcon className={adminOverviewLinkCardChevronClassName} aria-hidden />
        </Link>
    );
}

export function AdminOverviewPage({ data }: { data: GqlCAdminOverviewPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState<GqlCAdminOverviewPageAdminFragment | null>(seedAdmin);
    const variables = adminOverviewPageVariables();

    useEffect(() => {
        setAdmin(seedAdmin);
    }, [seedAdmin]);

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminOverviewPageUpdatesDocument, variables);
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seedAdmin]);

    const pendingCooks = admin?.pendingCooks ?? [];
    const pendingCooksCount = admin?.pendingCooksCounts[0] ?? 0;
    const blockedBookingRequests = admin?.blockedBookingRequests ?? [];
    const blockedBookingRequestsCount = admin?.blockedBookingRequestsCounts[0] ?? 0;
    const duePayoutOffers = admin?.duePayoutOffers ?? [];
    const duePayoutOffersCount = admin?.duePayoutOffersCounts[0] ?? 0;
    const openSupportRequests = admin?.openSupportRequests ?? [];
    const openSupportRequestsCount = admin?.openSupportRequestsCounts[0] ?? 0;
    const pendingOfferChatReviews = admin?.pendingOfferChatReviews ?? [];
    const pendingOfferChatReviewsCount = admin?.pendingOfferChatReviewsCounts[0] ?? 0;
    const allQueuesClear =
        pendingCooksCount === 0 &&
        blockedBookingRequestsCount === 0 &&
        duePayoutOffersCount === 0 &&
        openSupportRequestsCount === 0 &&
        pendingOfferChatReviewsCount === 0;

    const viewAllClassName = 'text-sm font-medium text-foreground underline-offset-4 hover:underline';

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="mx-auto grid w-full max-w-6xl content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminOverviewPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">
                        {
                            {
                                de: 'Offene Aufgaben im Überblick.',
                                en: 'Open tasks at a glance.',
                            }[locale]
                        }
                    </p>
                </div>

                <section className="grid gap-3" aria-labelledby="admin-open-tasks-heading">
                    <h2 id="admin-open-tasks-heading" className="text-lg font-medium">
                        {{ de: 'Offene Aufgaben', en: 'Open tasks' }[locale]}
                    </h2>
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                        <AdminOverviewStatCard
                            label={{ de: 'Freischaltungen', en: 'Approvals' }[locale]}
                            value={pendingCooksCount}
                            attention={pendingCooksCount > 0}
                            to={adminUsersSectionTo('list')}
                            search={{ type: 'cook', unapproved: true }}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Buchungsprüfung', en: 'Booking review' }[locale]}
                            value={blockedBookingRequestsCount}
                            attention={blockedBookingRequestsCount > 0}
                            to="/{-$locale}/admin/booking-requests/list"
                            search={{ publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW' }}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Auszahlungen', en: 'Due payouts' }[locale]}
                            value={duePayoutOffersCount}
                            attention={duePayoutOffersCount > 0}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Support', en: 'Support' }[locale]}
                            value={openSupportRequestsCount}
                            attention={openSupportRequestsCount > 0}
                            to="/{-$locale}/admin/support-requests"
                            search={{ status: 'OPEN' }}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Angebots-Chats', en: 'Offer chats' }[locale]}
                            value={pendingOfferChatReviewsCount}
                            attention={pendingOfferChatReviewsCount > 0}
                            to="/{-$locale}/admin/offer-chat-reviews"
                        />
                    </dl>
                </section>

                {allQueuesClear ? (
                    <StatusAlert tone="success" title={{ de: 'Alles erledigt', en: 'All done' }[locale]}>
                        {
                            {
                                de: 'Keine Freischaltungen, Buchungsprüfungen, Auszahlungen, Support-Anfragen oder Angebots-Chats warten.',
                                en: 'No approvals, booking reviews, payouts, support requests, or offer chats are waiting.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : (
                    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
                        {pendingCooksCount > 0 ? (
                            <AdminOverviewQueueSection
                                headingId="pending-cook-approvals-heading"
                                title={{ de: 'Freischaltungen ausstehend', en: 'Pending approvals' }[locale]}
                                viewAll={
                                    pendingCooksCount > PENDING_COOKS_TAKE ? (
                                        <Link
                                            to={adminUsersSectionTo('list')}
                                            search={{ type: 'cook', unapproved: true }}
                                            className={viewAllClassName}
                                        >
                                            {{ de: 'Alle anzeigen', en: 'View all' }[locale]}
                                        </Link>
                                    ) : null
                                }
                            >
                                <ul className="grid gap-2">
                                    {pendingCooks.map((user) => (
                                        <li key={user.userId}>
                                            <AdminOverviewQueueItemLink
                                                to="/{-$locale}/admin/users/$userId"
                                                params={{ userId: user.userId }}
                                                search={{ tab: 'cook-profile' }}
                                                title={userDisplayName(user)}
                                                detail={`${user.emailAddress} · ${formatDate(user.createdAt, { locale, timeZone, dateStyle: 'medium' })}`}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </AdminOverviewQueueSection>
                        ) : null}

                        {blockedBookingRequestsCount > 0 ? (
                            <AdminOverviewQueueSection
                                headingId="blocked-booking-requests-heading"
                                title={{ de: 'Buchungsanfragen zur Prüfung', en: 'Booking requests for review' }[locale]}
                                viewAll={
                                    blockedBookingRequestsCount > BLOCKED_BOOKING_REQUESTS_TAKE ? (
                                        <Link
                                            to="/{-$locale}/admin/booking-requests/list"
                                            search={{ publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW' }}
                                            className={viewAllClassName}
                                        >
                                            {{ de: 'Alle anzeigen', en: 'View all' }[locale]}
                                        </Link>
                                    ) : null
                                }
                            >
                                <ul className="grid gap-2">
                                    {blockedBookingRequests.map((request) => {
                                        const location =
                                            request.exactEventAddress.city.trim().length > 0
                                                ? request.exactEventAddress.city
                                                : request.exactEventAddress.displayText;
                                        const participantCount = request.participants.length;
                                        return (
                                            <li key={request.bookingRequestId}>
                                                <AdminOverviewQueueItemLink
                                                    to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                                                    params={{ bookingRequestId: request.bookingRequestId }}
                                                    title={request.occasion}
                                                    detail={`${userDisplayName(request.customer)} · ${formatDateTime(request.dateTime, { locale, timeZone, dateStyle: 'full' })} · ${location} · ${
                                                        {
                                                            de: `${participantCount} Teilnehmer`,
                                                            en: `${participantCount} participants`,
                                                        }[locale]
                                                    }`}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </AdminOverviewQueueSection>
                        ) : null}

                        {duePayoutOffersCount > 0 ? (
                            <AdminOverviewQueueSection
                                headingId="due-payout-offers-heading"
                                title={{ de: 'Auszahlungen fällig', en: 'Due payouts' }[locale]}
                            >
                                <ul className="grid gap-2">
                                    {duePayoutOffers.map((offer) => {
                                        const blockedLabel = cookPayoutBlockedReasonLabel(offer.cookPayoutBlockedReason, locale);
                                        const payoutMeta = [
                                            formatCurrency(offer.payoutCentsCook, { locale, maximumFractionDigits: 0 }),
                                            offer.plannedPayoutDateTime
                                                ? formatDate(offer.plannedPayoutDateTime, { locale, timeZone, dateStyle: 'medium' })
                                                : null,
                                            offer.cookPayoutReady
                                                ? { de: 'Bereit', en: 'Ready' }[locale]
                                                : (blockedLabel ?? { de: 'Nicht bereit', en: 'Not ready' }[locale]),
                                        ]
                                            .filter(Boolean)
                                            .join(' · ');
                                        return (
                                            <li key={offer.bookingRequestOfferId}>
                                                <AdminOverviewQueueItemLink
                                                    to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                                    params={{
                                                        bookingRequestId: offer.bookingRequestId,
                                                        bookingRequestOfferId: offer.bookingRequestOfferId,
                                                    }}
                                                    search={{ tab: 'costs' }}
                                                    title={userDisplayName(offer.cook.user)}
                                                    detail={payoutMeta}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </AdminOverviewQueueSection>
                        ) : null}

                        {openSupportRequestsCount > 0 ? (
                            <AdminOverviewQueueSection
                                headingId="open-support-requests-heading"
                                title={{ de: 'Offene Support-Anfragen', en: 'Open support requests' }[locale]}
                                viewAll={
                                    openSupportRequestsCount > OPEN_SUPPORT_REQUESTS_TAKE ? (
                                        <Link
                                            to="/{-$locale}/admin/support-requests"
                                            search={{ status: 'OPEN' }}
                                            className={viewAllClassName}
                                        >
                                            {{ de: 'Alle anzeigen', en: 'View all' }[locale]}
                                        </Link>
                                    ) : null
                                }
                            >
                                <ul className="grid gap-2">
                                    {openSupportRequests.map((request) => (
                                        <li key={request.supportRequestId}>
                                            <AdminOverviewQueueItemLink
                                                to="/{-$locale}/admin/support-requests/$supportRequestId"
                                                params={{ supportRequestId: request.supportRequestId }}
                                                title={request.subject}
                                                detail={`${userDisplayName(request.customer)} · ${formatDate(request.createdAt, { locale, timeZone, dateStyle: 'medium' })}${
                                                    request.adminUnreadNotificationCount > 0
                                                        ? ` · ${request.adminUnreadNotificationCount} ${{ de: 'ungelesen', en: 'unread' }[locale]}`
                                                        : ''
                                                }`}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </AdminOverviewQueueSection>
                        ) : null}

                        {pendingOfferChatReviewsCount > 0 ? (
                            <AdminOverviewQueueSection
                                headingId="pending-offer-chat-reviews-heading"
                                title={{ de: 'Angebots-Chats zur Prüfung', en: 'Offer chats for review' }[locale]}
                                viewAll={
                                    pendingOfferChatReviewsCount > PENDING_OFFER_CHAT_REVIEWS_TAKE ? (
                                        <Link to="/{-$locale}/admin/offer-chat-reviews" className={viewAllClassName}>
                                            {{ de: 'Alle anzeigen', en: 'View all' }[locale]}
                                        </Link>
                                    ) : null
                                }
                            >
                                <ul className="grid gap-2">
                                    {pendingOfferChatReviews.map((offer) => {
                                        const pending = offer.adminChatReviewPendingCount;
                                        const pendingLabel =
                                            pending === 1
                                                ? { de: '1 neue Nachricht', en: '1 new message' }[locale]
                                                : {
                                                      de: `${pending} neue Nachrichten`,
                                                      en: `${pending} new messages`,
                                                  }[locale];
                                        return (
                                            <li key={offer.bookingRequestOfferId}>
                                                <AdminOverviewQueueItemLink
                                                    to="/{-$locale}/admin/offer-chat-reviews/$bookingRequestOfferId"
                                                    params={{ bookingRequestOfferId: offer.bookingRequestOfferId }}
                                                    title={offer.bookingRequest.occasion}
                                                    detail={`${userDisplayName(offer.bookingRequest.customer)} · ${userDisplayName(offer.cook.user)} · ${pendingLabel}`}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </AdminOverviewQueueSection>
                        ) : null}
                    </div>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
