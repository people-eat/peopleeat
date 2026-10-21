import { Link, useRouter } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import {
    BanknoteIcon,
    CheckIcon,
    CopyIcon,
    ExternalLinkIcon,
    FileTextIcon,
    MessageSquareIcon,
    StarIcon,
    UtensilsCrossedIcon,
    VideoIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import {
    bookingRequestOfferChatCanSend,
    bookingRequestPaidParticipants,
    formatCurrency,
    formatDate,
    formatDateTime,
    userDisplayName,
} from '../../../shared';
import { AdminBookingRequestOfferCallRecordingsSection } from '../../components/AdminBookingRequestOfferCallRecordingsSection';
import { adminBookingRequestOfferStatusLabel } from '../../components/adminBookingRequestOfferStatus';
import { AdminBookingRequestOfferTestimonialsSection } from '../../components/AdminBookingRequestOfferTestimonialsSection';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { AdminQueuedJobsSection } from '../../components/AdminQueuedJobsSection';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/base/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/base/avatar';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/base/card';
import { Separator } from '../../components/base/separator';
import { StatusAlert } from '../../components/base/status-alert';
import { StatusBadge } from '../../components/base/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/base/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
import { BookingRequestOfferAttentionBanner } from '../../components/BookingRequestOfferAttentionBanner';
import { BookingRequestOfferCallTab } from '../../components/BookingRequestOfferCallTab';
import { BookingRequestOfferChat } from '../../components/BookingRequestOfferChat';
import { BookingRequestOfferParticipantAmendmentAdminPanel } from '../../components/BookingRequestOfferParticipantAmendmentPanel';
import { BookingRequestOfferCostOverviewPanel } from '../../components/BookingRequestOfferPriceConfigurationPanel';
import { bookingRequestOfferStatusClassName } from '../../components/bookingRequestOfferStatus';
import { BookingStatusPill } from '../../components/BookingStatusPill';
import { CookMenuCard } from '../../components/CookMenuCard';
import { CostBreakdownPanel } from '../../components/CostBreakdownPanel';
import { OfferMenuConfigured } from '../../components/OfferMenuConfigured';
import type {
    GqlCAdminBookingRequestOfferPageOfferFragment,
    GqlCAdminBookingRequestOfferPageQuery,
    GqlCAdminBookingRequestOfferPageRequestFragment,
    GqlCAdminCookPayoutBlockedReason,
} from '../../graphql/generated';
import {
    AdminBookingRequestOfferCallCreateDocument,
    AdminBookingRequestOfferCallJoinDocument,
    AdminBookingRequestOfferCallLeaveDocument,
    AdminBookingRequestOfferCallSlotDeclineDocument,
    AdminBookingRequestOfferChatMessageCreateDocument,
    AdminBookingRequestOfferChatMessageDeleteDocument,
    AdminBookingRequestOfferChatMessageReactionUpsertDocument,
    AdminBookingRequestOfferChatMessageUpdateDocument,
    AdminBookingRequestOfferChatMessageVisibilityUpdateDocument,
    AdminBookingRequestOfferPageUpdatesDocument,
    AdminBookingRequestOfferPayoutAlreadyTookPlaceCheckDocument,
    AdminBookingRequestOfferPayoutMarkOutOfSystemDocument,
    AdminBookingRequestOfferPayoutReleaseDocument,
    AdminBookingRequestOfferPreparationsClearDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { AdminBookingRequestOfferHandoverDialog } from './AdminBookingRequestOfferHandoverDialog';
import { adminBookingRequestCustomerLabel } from './adminBookingRequestsColumns';
import { adminStubRouteBySlug } from './adminCatalog';

const listRoute = adminStubRouteBySlug('booking-requests');

export const adminBookingRequestOfferPageTitle = { de: 'Angebot', en: 'Offer' } as const;
export const adminBookingRequestOfferPageDescription = {
    de: 'Angebot prüfen und im Chat mitlesen.',
    en: 'Review the offer and follow the negotiation chat.',
} as const;

const OFFER_TABS = ['chat', 'offer', 'costs', 'menu', 'call', 'testimonial'] as const;

export type AdminBookingRequestOfferTab = (typeof OFFER_TABS)[number];

export type AdminBookingRequestOfferSearch = {
    tab?: AdminBookingRequestOfferTab;
};

function isOfferTab(value: unknown): value is AdminBookingRequestOfferTab {
    return typeof value === 'string' && (OFFER_TABS as readonly string[]).includes(value);
}

export function parseAdminBookingRequestOfferSearch(search: Record<string, unknown>): AdminBookingRequestOfferSearch {
    // Legacy `schedule` deep links resolve to the merged Call tab.
    const raw = search.tab === 'schedule' ? 'call' : search.tab;
    const tab = isOfferTab(raw) ? raw : undefined;
    return { tab };
}

function resolveOfferTab(
    tab: AdminBookingRequestOfferTab | undefined,
    visible: ReadonlySet<AdminBookingRequestOfferTab>,
): AdminBookingRequestOfferTab {
    if (tab && isOfferTab(tab) && visible.has(tab)) return tab;
    return 'chat';
}

type OfferTabDef = {
    id: AdminBookingRequestOfferTab;
    label: Record<Locale, string>;
    Icon: LucideIcon;
};

const OFFER_TAB_DEFS: readonly OfferTabDef[] = [
    { id: 'chat', label: { de: 'Chat', en: 'Chat' }, Icon: MessageSquareIcon },
    { id: 'offer', label: { de: 'Angebot', en: 'Offer' }, Icon: FileTextIcon },
    { id: 'costs', label: { de: 'Kosten', en: 'Costs' }, Icon: BanknoteIcon },
    { id: 'menu', label: { de: 'Menü', en: 'Menu' }, Icon: UtensilsCrossedIcon },
    { id: 'call', label: { de: 'Anruf', en: 'Call' }, Icon: VideoIcon },
    { id: 'testimonial', label: { de: 'Bewertung', en: 'Review' }, Icon: StarIcon },
];

export function adminBookingRequestOfferPageVariables(bookingRequestId: string, bookingRequestOfferId: string) {
    return { bookingRequestId, bookingRequestOfferId };
}

function CopyValueButton({ text }: { text: string }) {
    const locale = useLocale();
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleLabel = { de: 'Kopieren', en: 'Copy' }[locale];
    const ariaLabel = copied ? { de: 'Kopiert', en: 'Copied' }[locale] : idleLabel;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success({ de: 'In die Zwischenablage kopiert', en: 'Copied to clipboard' }[locale]);
        } catch {
            toast.error({ de: 'Kopieren in die Zwischenablage fehlgeschlagen', en: 'Could not copy to clipboard' }[locale]);
        }
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
    }, [text, locale]);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={ariaLabel}
                    onClick={() => void onCopy()}
                    className="opacity-70 hover:opacity-100"
                >
                    {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{ariaLabel}</TooltipContent>
        </Tooltip>
    );
}

function DetailField({ label, value, mono, copyText }: { label: string; value: ReactNode; mono?: boolean; copyText?: string }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="flex min-w-0 items-start gap-1">
                <div
                    className={
                        mono ? 'min-w-0 flex-1 font-mono text-xs break-all text-foreground' : 'min-w-0 flex-1 text-sm text-foreground'
                    }
                >
                    {value}
                </div>
                {copyText != null ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                        <CopyValueButton text={copyText} />
                    </div>
                ) : null}
            </dd>
        </div>
    );
}

function AcceptStatusBadge({ value, locale }: { value: boolean | null | undefined; locale: Locale }) {
    if (value == null) {
        return <StatusBadge tone="info">{{ de: 'Offen', en: 'Open' }[locale]}</StatusBadge>;
    }
    if (value) {
        return <StatusBadge tone="success">{{ de: 'Ja', en: 'Yes' }[locale]}</StatusBadge>;
    }
    return <StatusBadge tone="error">{{ de: 'Nein', en: 'No' }[locale]}</StatusBadge>;
}

function OfferCostViews({
    offer,
    request,
    locale,
}: {
    offer: GqlCAdminBookingRequestOfferPageOfferFragment;
    request: GqlCAdminBookingRequestOfferPageRequestFragment | null;
    locale: Locale;
}) {
    const adults = request?.participants.filter((participant) => participant.type === 'ADULT').length ?? 0;
    const discounted = request?.participants.filter((participant) => participant.type === 'DISCOUNTED').length ?? 0;
    const paid = bookingRequestPaidParticipants(adults, discounted);
    const pricePerPersonCents = paid > 0 ? Math.round(offer.menuPriceCents / paid) : 0;
    const showCookView = paid > 0 && offer.menuPriceCents > 0;

    return (
        <div className="grid items-start gap-4 @3xl:grid-cols-2">
            <div className="grid gap-3">
                <h2 className="text-sm font-medium text-foreground">{{ de: 'Kundensicht', en: 'Customer view' }[locale]}</h2>
                <Card className="gap-4 py-4">
                    <CardContent className="px-4">
                        <CostBreakdownPanel
                            locale={locale}
                            lineItems={offer.costBreakdown.lineItems}
                            total={offer.costBreakdown.total}
                            footer={
                                {
                                    de: 'Die An- und Abreise sind im Gesamtpreis inkludiert',
                                    en: 'Travel to and from the venue is included in the total price',
                                }[locale]
                            }
                        />
                    </CardContent>
                </Card>
            </div>
            {showCookView ? (
                <div className="grid gap-3">
                    <h2 className="text-sm font-medium text-foreground">{{ de: 'Kochsicht', en: 'Cook view' }[locale]}</h2>
                    <BookingRequestOfferCostOverviewPanel
                        locale={locale}
                        viewer="admin"
                        participantsAdult={adults}
                        participantsDiscounted={discounted}
                        pricePerPersonCents={pricePerPersonCents}
                        travelExpensesCents={offer.travelExpensesCents}
                        menuPriceCents={offer.menuPriceCents}
                        storedPrice={{
                            platformFeeCentsCook: offer.platformFeeCentsCook,
                            platformFeeCentsCustomer: offer.platformFeeCentsCustomer,
                            paymentProviderFeeCents: offer.paymentProviderFeeCents,
                            payoutCentsCook: offer.payoutCentsCook,
                            totalWithoutDiscountsCentsCustomer: offer.totalWithoutDiscountsCentsCustomer,
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}

function cookPayoutBlockedReasonMessage(reason: GqlCAdminCookPayoutBlockedReason | null | undefined, locale: Locale): string {
    if (reason == null) {
        return { de: 'Koch kann derzeit keine Auszahlung empfangen.', en: 'Cook cannot receive a payout right now.' }[locale];
    }
    return {
        MISSING_STRIPE_ACCOUNT: {
            de: 'Der Koch hat noch kein Stripe-Konto verbunden.',
            en: 'The cook has not connected a Stripe account yet.',
        },
        STRIPE_ACCOUNT_INACTIVE: {
            de: 'Das Stripe-Konto des Kochs ist nicht aktiv.',
            en: "The cook's Stripe account is not active.",
        },
        STRIPE_PAYOUTS_DISABLED: {
            de: 'Stripe-Auszahlungen sind für dieses Konto noch nicht freigeschaltet.',
            en: 'Stripe payouts are not enabled on this account yet.',
        },
    }[reason][locale];
}

function offerPayoutDue(offer: GqlCAdminBookingRequestOfferPageOfferFragment, now: Date = new Date()): boolean {
    if (offer.paymentStatus !== 'PAYED') return false;
    if (offer.payoutDateTime != null) return false;
    if (offer.plannedPayoutDateTime == null) return false;
    return new Date(offer.plannedPayoutDateTime).getTime() <= now.getTime();
}

function offerPayoutDone(offer: GqlCAdminBookingRequestOfferPageOfferFragment): boolean {
    if (offer.payoutDateTime != null) return true;
    return offer.paymentStatus === 'TRANSFERRED' || offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM';
}

function offerPayoutAlreadyTookPlaceCheckable(offer: GqlCAdminBookingRequestOfferPageOfferFragment): boolean {
    return offerPayoutDue(offer) || offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM';
}

function canHandOverOffer(
    offer: GqlCAdminBookingRequestOfferPageOfferFragment,
    request: GqlCAdminBookingRequestOfferPageRequestFragment | null,
): boolean {
    if (!(offer.userAccepted === true && offer.cookAccepted === true)) return false;
    if (!request?.dateTime) return false;
    return new Date(request.dateTime).getTime() > Date.now();
}

export function AdminBookingRequestOfferPage({
    data,
    search,
    bookingRequestId,
    bookingRequestOfferId,
}: {
    data: GqlCAdminBookingRequestOfferPageQuery;
    search: AdminBookingRequestOfferSearch;
    bookingRequestId: string;
    bookingRequestOfferId: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const router = useRouter();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedOffer = seedAdmin?.bookingRequestOffer ?? null;
    const seedRequest = seedAdmin?.bookingRequest ?? null;
    const offerMatches =
        seedOffer != null && seedOffer.bookingRequestOfferId === bookingRequestOfferId && seedOffer.bookingRequestId === bookingRequestId;

    const [offer, setOffer] = useState<GqlCAdminBookingRequestOfferPageOfferFragment | null>(offerMatches ? seedOffer : null);
    const [request, setRequest] = useState<GqlCAdminBookingRequestOfferPageRequestFragment | null>(seedRequest);
    const [handoverOpen, setHandoverOpen] = useState(false);
    const [, sendChatMessage] = useMutation(AdminBookingRequestOfferChatMessageCreateDocument);
    const [, upsertOfferChatReaction] = useMutation(AdminBookingRequestOfferChatMessageReactionUpsertDocument);
    const [, updateChatMessage] = useMutation(AdminBookingRequestOfferChatMessageUpdateDocument);
    const [, updateChatMessageVisibility] = useMutation(AdminBookingRequestOfferChatMessageVisibilityUpdateDocument);
    const [, deleteChatMessage] = useMutation(AdminBookingRequestOfferChatMessageDeleteDocument);

    const showSchedule = offer != null && (offer.cook.callSchedulingEnabled || offer.callBookings.length > 0);
    const showTestimonialTab =
        offer != null && (offer.status === 'COMPLETED' || offer.customerTestimonial != null || offer.cookTestimonial != null);
    const visibleTabs = useMemo(() => {
        const ids = new Set<AdminBookingRequestOfferTab>(['chat', 'offer', 'costs', 'menu', 'call']);
        if (showTestimonialTab) ids.add('testimonial');
        return ids;
    }, [showTestimonialTab]);
    const tab = resolveOfferTab(search.tab, visibleTabs);
    const visibleTabDefs = OFFER_TAB_DEFS.filter((entry) => visibleTabs.has(entry.id));
    const crumbRequestLabel = request?.occasion.trim() || adminBookingRequestOfferPageTitle[locale];
    const crumbOfferLabel = offer ? userDisplayName(offer.cook.user) : adminBookingRequestOfferPageTitle[locale];
    const pendingCall = offer?.callBookings.find((booking) => booking.status === 'PENDING') ?? null;
    const confirmedCall = offer?.callBookings.find((booking) => booking.status === 'CONFIRMED') ?? null;

    useEffect(() => {
        setOffer(offerMatches ? seedOffer : null);
        setRequest(seedRequest);
    }, [offerMatches, seedOffer, seedRequest]);

    useEffect(() => {
        if (!seedAdmin) return;
        const subscription = createRequest(AdminBookingRequestOfferPageUpdatesDocument, {
            bookingRequestId,
            bookingRequestOfferId,
        });
        const { unsubscribe } = pipe(
            client.executeSubscription(subscription),
            subscribe((result) => {
                const next = result.data?.adminUpdates;
                if (!next) return;
                if (next.bookingRequestOffer?.bookingRequestOfferId === bookingRequestOfferId) {
                    setOffer(next.bookingRequestOffer);
                }
                if (next.bookingRequest) setRequest(next.bookingRequest);
            }),
        );
        return unsubscribe;
    }, [bookingRequestId, bookingRequestOfferId, client, seedAdmin]);

    const canSend = offer != null && bookingRequestOfferChatCanSend(offer.status);
    const canHandover = offer != null && canHandOverOffer(offer, request);
    const handoverCooks = (request?.cooksInTravelRadius ?? []).map((row) => ({
        cookId: row.cook.cookId,
        estimatedTravelDistanceKm: row.estimatedTravelDistanceKm,
        city: row.cook.exactTravelOriginAddress?.city,
        firstName: row.cook.user.firstName,
        lastName: row.cook.user.lastName,
    }));

    return (
        <>
            <AdminPageChrome
                crumbs={[
                    { label: listRoute.title[locale], to: '/{-$locale}/admin/booking-requests' },
                    {
                        label: crumbRequestLabel,
                        to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
                        params: { bookingRequestId },
                    },
                    { label: crumbOfferLabel },
                ]}
                contentClassName="min-h-0 overflow-hidden gap-0"
            >
                <AdminPinnedFooterLayout
                    className="@container min-w-0"
                    contentScroll={false}
                    contentClassName="flex w-full min-w-0 flex-col pb-0"
                    footer={
                        offer && ((tab === 'offer' && canHandover) || tab === 'costs' || (tab === 'menu' && offer.configuredMenu)) ? (
                            <>
                                {tab === 'offer' && canHandover ? (
                                    <Button type="button" variant="outline" onClick={() => setHandoverOpen(true)}>
                                        {{ de: 'Übergeben', en: 'Hand over' }[locale]}
                                    </Button>
                                ) : null}
                                {tab === 'menu' && offer.configuredMenu ? (
                                    <Button type="button" variant="outline" asChild>
                                        <Link
                                            to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/edit-configured-menu"
                                            params={{ bookingRequestId, bookingRequestOfferId }}
                                        >
                                            {{ de: 'Menü bearbeiten', en: 'Edit menu' }[locale]}
                                        </Link>
                                    </Button>
                                ) : null}
                                {tab === 'costs' ? (
                                    <Button type="button" asChild>
                                        <Link
                                            to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/edit"
                                            params={{ bookingRequestId, bookingRequestOfferId }}
                                        >
                                            {{ de: 'Preis bearbeiten', en: 'Edit price' }[locale]}
                                        </Link>
                                    </Button>
                                ) : null}
                            </>
                        ) : undefined
                    }
                >
                    {offer ? (
                        <>
                            <div className="grid shrink-0 gap-2 px-4 pb-1">
                                <div className="flex flex-wrap items-center justify-end gap-3">
                                    <BookingStatusPill className={bookingRequestOfferStatusClassName(offer.status)}>
                                        {adminBookingRequestOfferStatusLabel(offer.status, locale)}
                                    </BookingStatusPill>
                                </div>
                                {pendingCall && showSchedule ? (
                                    <BookingRequestOfferAttentionBanner
                                        message={
                                            {
                                                de:
                                                    pendingCall.initiator === 'CUSTOMER'
                                                        ? 'Terminanfrage ausstehend: Kunde wartet auf den Koch'
                                                        : 'Terminanfrage ausstehend: Koch wartet auf den Kunden',
                                                en:
                                                    pendingCall.initiator === 'CUSTOMER'
                                                        ? 'Call request pending: customer awaiting chef'
                                                        : 'Call request pending: chef awaiting customer',
                                            }[locale]
                                        }
                                        actionLabel={{ de: 'Zum Anruf', en: 'View call' }[locale]}
                                        actionLink={
                                            tab !== 'call'
                                                ? {
                                                      to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                                                      params: { bookingRequestId, bookingRequestOfferId },
                                                      search: { tab: 'call' },
                                                  }
                                                : undefined
                                        }
                                    />
                                ) : null}
                            </div>

                            <Tabs value={tab} className="flex min-h-0 flex-1 flex-col gap-0">
                                <div className="px-4">
                                    <TabsList
                                        variant="line"
                                        className="shrink-0"
                                        aria-label={{ de: 'Angebotsbereiche', en: 'Offer sections' }[locale]}
                                    >
                                        {visibleTabDefs.map(({ id, label, Icon }) => (
                                            <TabsTrigger key={id} value={id} asChild>
                                                <Link
                                                    to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                                    params={{ bookingRequestId, bookingRequestOfferId }}
                                                    search={{ tab: id === 'chat' ? undefined : id }}
                                                    replace
                                                >
                                                    <Icon aria-hidden />
                                                    {label[locale]}
                                                </Link>
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </div>

                                <TabsContent value="chat" className="mt-4 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
                                    {offer.activeCallRoom?.status === 'ACTIVE' || (!pendingCall && confirmedCall && showSchedule) ? (
                                        <div className="grid shrink-0 gap-3 px-4">
                                            {offer.activeCallRoom?.status === 'ACTIVE' ? (
                                                <StatusAlert
                                                    tone="info"
                                                    title={{ de: 'Anruf läuft', en: 'Call in progress' }[locale]}
                                                    action={
                                                        <Button type="button" size="sm" asChild>
                                                            <Link
                                                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                                                params={{ bookingRequestId, bookingRequestOfferId }}
                                                                search={{ tab: 'call' }}
                                                                replace
                                                            >
                                                                {{ de: 'Zum Anruf', en: 'Go to call' }[locale]}
                                                            </Link>
                                                        </Button>
                                                    }
                                                >
                                                    {
                                                        {
                                                            de: 'Ein Videoanruf für dieses Angebot ist aktiv.',
                                                            en: 'A video call for this offer is active.',
                                                        }[locale]
                                                    }
                                                </StatusAlert>
                                            ) : null}
                                            {!pendingCall && confirmedCall && showSchedule ? (
                                                <StatusAlert
                                                    tone="info"
                                                    title={{ de: 'Gesprächstermin bestätigt', en: 'Discovery call confirmed' }[locale]}
                                                    action={
                                                        <Button type="button" size="sm" asChild>
                                                            <Link
                                                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                                                params={{ bookingRequestId, bookingRequestOfferId }}
                                                                search={{ tab: 'call' }}
                                                                replace
                                                            >
                                                                {{ de: 'Zum Anruf', en: 'View call' }[locale]}
                                                            </Link>
                                                        </Button>
                                                    }
                                                >
                                                    {
                                                        {
                                                            de: 'Der bestätigte Termin erscheint unter Anruf (nur Ansicht).',
                                                            en: 'The confirmed appointment is on the Call tab (read-only).',
                                                        }[locale]
                                                    }
                                                </StatusAlert>
                                            ) : null}
                                        </div>
                                    ) : null}
                                    <BookingRequestOfferChat
                                        messages={offer.messages}
                                        canSend={canSend}
                                        peers={[
                                            ...(request
                                                ? [
                                                      {
                                                          display: adminBookingRequestCustomerLabel(request.customer),
                                                          profilePictureUrl: request.customer.profilePicture?.url,
                                                      },
                                                  ]
                                                : []),
                                            {
                                                display: userDisplayName(offer.cook.user),
                                                profilePictureUrl: offer.cook.user.profilePicture?.url,
                                            },
                                        ]}
                                        viewerRole="admin"
                                        onSend={async (message, fileUploadIds) => {
                                            const result = await sendChatMessage({ bookingRequestOfferId, message, fileUploadIds });
                                            if (result.error || !result.data?.admin.bookingRequestOfferChatMessageCreate.success) {
                                                toast.error(
                                                    {
                                                        de: 'Nachricht konnte nicht gesendet werden.',
                                                        en: 'Could not send the message.',
                                                    }[locale],
                                                );
                                                return false;
                                            }
                                            return true;
                                        }}
                                        onEditMessage={async (chatMessageId, message) => {
                                            const result = await updateChatMessage({
                                                bookingRequestOfferEventId: chatMessageId,
                                                message,
                                            });
                                            if (result.error || !result.data?.admin.bookingRequestOfferChatMessageUpdate.success) {
                                                toast.error(
                                                    {
                                                        de: 'Nachricht konnte nicht gespeichert werden.',
                                                        en: 'Could not save the message.',
                                                    }[locale],
                                                );
                                                return false;
                                            }
                                            return true;
                                        }}
                                        onVisibilityChangeMessage={async (chatMessageId, hiddenByAdmin) => {
                                            const result = await updateChatMessageVisibility({
                                                bookingRequestOfferEventId: chatMessageId,
                                                hiddenByAdmin,
                                            });
                                            if (
                                                result.error ||
                                                !result.data?.admin.bookingRequestOfferChatMessageVisibilityUpdate.success
                                            ) {
                                                toast.error(
                                                    hiddenByAdmin
                                                        ? {
                                                              de: 'Nachricht konnte nicht verborgen werden.',
                                                              en: 'Could not hide the message.',
                                                          }[locale]
                                                        : {
                                                              de: 'Nachricht konnte nicht wieder angezeigt werden.',
                                                              en: 'Could not show the message again.',
                                                          }[locale],
                                                );
                                                return false;
                                            }
                                            return true;
                                        }}
                                        onDeleteMessage={async (chatMessageId) => {
                                            const result = await deleteChatMessage({
                                                bookingRequestOfferEventId: chatMessageId,
                                            });
                                            if (result.error || !result.data?.admin.bookingRequestOfferChatMessageDelete.success) {
                                                toast.error(
                                                    {
                                                        de: 'Nachricht konnte nicht gelöscht werden.',
                                                        en: 'Could not delete the message.',
                                                    }[locale],
                                                );
                                                return false;
                                            }
                                            return true;
                                        }}
                                        onReactMessage={async (chatMessageId, emoji) => {
                                            const result = await upsertOfferChatReaction({
                                                bookingRequestOfferEventId: chatMessageId,
                                                emoji,
                                            });
                                            if (result.error || !result.data?.admin.bookingRequestOfferChatMessageReactionUpsert.success) {
                                                toast.error(
                                                    {
                                                        de: 'Reaktion konnte nicht gespeichert werden.',
                                                        en: 'Could not save the reaction.',
                                                    }[locale],
                                                );
                                                return false;
                                            }
                                            return true;
                                        }}
                                    />
                                </TabsContent>

                                <TabsContent
                                    value="offer"
                                    className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                                >
                                    <OfferMetaTabPanel offer={offer} request={request} locale={locale} timeZone={timeZone} />
                                </TabsContent>

                                <TabsContent
                                    value="costs"
                                    className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                                >
                                    <CostsTabPanel offer={offer} request={request} locale={locale} timeZone={timeZone} />
                                </TabsContent>

                                <TabsContent
                                    value="menu"
                                    className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                                >
                                    <MenuTabPanel offer={offer} locale={locale} />
                                </TabsContent>

                                <TabsContent
                                    value="call"
                                    className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                                >
                                    <BookingRequestOfferCallTab
                                        role="admin"
                                        bookingRequestOfferId={bookingRequestOfferId}
                                        callBookings={offer.callBookings}
                                        activeCallRoom={offer.activeCallRoom ?? null}
                                        createDocument={AdminBookingRequestOfferCallCreateDocument}
                                        joinDocument={AdminBookingRequestOfferCallJoinDocument}
                                        leaveDocument={AdminBookingRequestOfferCallLeaveDocument}
                                        declineDocument={AdminBookingRequestOfferCallSlotDeclineDocument}
                                        showSchedule={showSchedule}
                                        callSchedulingEnabled={offer.cook.callSchedulingEnabled}
                                        callDurationMinutes={offer.cook.callDurationMinutes}
                                        peerDisplayName={request ? adminBookingRequestCustomerLabel(request.customer) : undefined}
                                    >
                                        <AdminBookingRequestOfferCallRecordingsSection recordings={offer.callRecordings} />
                                    </BookingRequestOfferCallTab>
                                </TabsContent>

                                {showTestimonialTab ? (
                                    <TabsContent
                                        value="testimonial"
                                        className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                                    >
                                        <AdminBookingRequestOfferTestimonialsSection
                                            bookingRequestOfferId={offer.bookingRequestOfferId}
                                            bookingRequestUserId={request?.customer.userId ?? ''}
                                            cookId={offer.cook.cookId}
                                            customerTestimonial={
                                                offer.customerTestimonial
                                                    ? {
                                                          id: offer.customerTestimonial.customerTestimonialId,
                                                          authorName: offer.customerTestimonial.authorName ?? null,
                                                          displayAuthorName: offer.customerTestimonial.displayAuthorName,
                                                          location: offer.customerTestimonial.location ?? null,
                                                          displayLocation: offer.customerTestimonial.displayLocation ?? null,
                                                          occasion: offer.customerTestimonial.occasion ?? null,
                                                          displayOccasion: offer.customerTestimonial.displayOccasion ?? null,
                                                          body: offer.customerTestimonial.body,
                                                          imageUrls: offer.customerTestimonial.imageUrls,
                                                          rating: offer.customerTestimonial.rating ?? null,
                                                          publicationStatus: offer.customerTestimonial.publicationStatus,
                                                      }
                                                    : null
                                            }
                                            cookTestimonial={
                                                offer.cookTestimonial
                                                    ? {
                                                          id: offer.cookTestimonial.cookTestimonialId,
                                                          authorName: offer.cookTestimonial.authorName ?? null,
                                                          displayAuthorName: offer.cookTestimonial.displayAuthorName,
                                                          location: offer.cookTestimonial.location ?? null,
                                                          displayLocation: offer.cookTestimonial.displayLocation ?? null,
                                                          occasion: offer.cookTestimonial.occasion ?? null,
                                                          displayOccasion: offer.cookTestimonial.displayOccasion ?? null,
                                                          body: offer.cookTestimonial.body ?? '',
                                                          imageUrls: offer.cookTestimonial.imageUrls,
                                                          rating: offer.cookTestimonial.rating ?? null,
                                                          publicationStatus: offer.cookTestimonial.publicationStatus,
                                                          lowRatingAnswers: offer.cookTestimonial.lowRatingAnswers ?? null,
                                                      }
                                                    : null
                                            }
                                        />
                                    </TabsContent>
                                ) : null}
                            </Tabs>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">{{ de: 'Angebot nicht gefunden.', en: 'Offer not found.' }[locale]}</p>
                    )}
                </AdminPinnedFooterLayout>
            </AdminPageChrome>
            {offer ? (
                <AdminBookingRequestOfferHandoverDialog
                    open={handoverOpen}
                    onOpenChange={setHandoverOpen}
                    bookingRequestOfferId={bookingRequestOfferId}
                    sourceCookId={offer.cook.cookId}
                    paymentStatus={offer.paymentStatus}
                    hasConfiguredMenu={offer.configuredMenu != null}
                    cooks={handoverCooks}
                    onSuccess={(newOfferId) => {
                        void router.navigate({
                            to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                            params: { bookingRequestId, bookingRequestOfferId: newOfferId },
                            search: { tab: 'offer' },
                        });
                    }}
                />
            ) : null}
        </>
    );
}

function money(cents: number, locale: Locale): string {
    return formatCurrency(cents, { locale });
}

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

function EconomicsRow({
    label,
    value,
    emphasize,
    highlight,
}: {
    label: string;
    value: string;
    emphasize?: boolean;
    highlight?: 'success';
}) {
    const labelClass =
        highlight === 'success'
            ? 'text-sm font-medium text-green-700'
            : emphasize
              ? 'text-sm font-medium text-foreground'
              : 'text-sm text-muted-foreground';
    const valueClass =
        highlight === 'success'
            ? 'shrink-0 text-base font-semibold tabular-nums text-green-700'
            : emphasize
              ? 'shrink-0 text-base font-semibold tabular-nums text-foreground'
              : 'shrink-0 text-sm tabular-nums text-foreground';

    return (
        <div className="flex items-baseline justify-between gap-4">
            <dt className={labelClass}>{label}</dt>
            <dd className={valueClass}>{value}</dd>
        </div>
    );
}

function OfferMetaTabPanel({
    offer,
    request,
    locale,
    timeZone,
}: {
    offer: GqlCAdminBookingRequestOfferPageOfferFragment;
    request: GqlCAdminBookingRequestOfferPageRequestFragment | null;
    locale: Locale;
    timeZone: string;
}) {
    const [{ fetching: preparationsClearBusy }, clearPreparations] = useMutation(AdminBookingRequestOfferPreparationsClearDocument);
    const cookDisplayName = userDisplayName(offer.cook.user);
    const cookProfilePictureUrl = offer.cook.user.profilePicture?.url ?? null;
    const customerDisplayName = request ? adminBookingRequestCustomerLabel(request.customer) : null;
    const customerProfilePictureUrl = request?.customer.profilePicture?.url ?? null;
    const openUserLabel = { de: 'Nutzer öffnen', en: 'Open user' }[locale];

    return (
        <div className="@container grid max-w-3xl gap-4">
            <BookingRequestOfferParticipantAmendmentAdminPanel
                locale={locale}
                amendment={offer.participantAmendment}
                preparationsCompletedAt={offer.preparationsCompletedAt}
                busy={preparationsClearBusy}
                onClearPreparations={async () => {
                    const result = await clearPreparations({ bookingRequestOfferId: offer.bookingRequestOfferId });
                    if (result.error || !result.data?.admin.bookingRequestOfferPreparationsClear.success) {
                        toast.error(
                            {
                                de: 'Sperre konnte nicht aufgehoben werden.',
                                en: 'Could not clear the preparations lock.',
                            }[locale],
                        );
                        return;
                    }
                    toast.success(
                        {
                            de: 'Vorbereitungssperre aufgehoben.',
                            en: 'Preparations lock cleared.',
                        }[locale],
                    );
                }}
            />
            <div className="grid items-start gap-4 @2xl:grid-cols-2">
                <Card className="gap-0 py-4">
                    <CardContent className="grid gap-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                                <Avatar className="size-12 shrink-0">
                                    {cookProfilePictureUrl ? (
                                        <AvatarImage src={cookProfilePictureUrl} alt="" className="object-cover" />
                                    ) : null}
                                    <AvatarFallback>{initialsFromName(cookDisplayName)}</AvatarFallback>
                                </Avatar>
                                <div className="grid min-w-0 flex-1 gap-0.5">
                                    <p className="truncate font-medium text-foreground">{cookDisplayName}</p>
                                    <p className="truncate text-sm text-muted-foreground">{offer.cook.user.emailAddress}</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                                {{ de: 'Koch', en: 'Cook' }[locale]}
                            </Badge>
                        </div>
                        <div>
                            <Button type="button" variant="outline" size="sm" asChild>
                                <Link to="/{-$locale}/admin/users/$userId" params={{ userId: offer.cook.user.userId }}>
                                    <ExternalLinkIcon data-icon="inline-start" />
                                    {openUserLabel}
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                {request && customerDisplayName ? (
                    <Card className="gap-0 py-4">
                        <CardContent className="grid gap-3 px-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <Avatar className="size-12 shrink-0">
                                        {customerProfilePictureUrl ? (
                                            <AvatarImage src={customerProfilePictureUrl} alt="" className="object-cover" />
                                        ) : null}
                                        <AvatarFallback>{initialsFromName(customerDisplayName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid min-w-0 flex-1 gap-0.5">
                                        <p className="truncate font-medium text-foreground">{customerDisplayName}</p>
                                        <p className="truncate text-sm text-muted-foreground">{request.customer.emailAddress}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="shrink-0">
                                    {{ de: 'Kunde', en: 'Customer' }[locale]}
                                </Badge>
                            </div>
                            <div>
                                <Button type="button" variant="outline" size="sm" asChild>
                                    <Link to="/{-$locale}/admin/users/$userId" params={{ userId: request.customer.userId }}>
                                        <ExternalLinkIcon data-icon="inline-start" />
                                        {openUserLabel}
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}
            </div>

            <div className="grid gap-3">
                <h2 className="text-sm font-medium text-foreground">{{ de: 'Angebotsstatus', en: 'Offer status' }[locale]}</h2>
                <Card className="gap-0 py-4">
                    <CardContent className="grid gap-4 px-4">
                        <dl className="grid gap-4 @sm:grid-cols-2">
                            <DetailField
                                label={{ de: 'Angebots-ID', en: 'Offer ID' }[locale]}
                                value={offer.bookingRequestOfferId}
                                mono
                                copyText={offer.bookingRequestOfferId}
                            />
                            <DetailField
                                label={{ de: 'Erstellt', en: 'Created' }[locale]}
                                value={formatDateTime(offer.createdAt, {
                                    locale,
                                    timeZone,
                                    dateStyle: 'long',
                                    timeStyle: 'short',
                                })}
                            />
                            <DetailField
                                label={{ de: 'Kunde akzeptiert', en: 'Customer accepted' }[locale]}
                                value={<AcceptStatusBadge value={offer.userAccepted} locale={locale} />}
                            />
                            <DetailField
                                label={{ de: 'Koch akzeptiert', en: 'Cook accepted' }[locale]}
                                value={<AcceptStatusBadge value={offer.cookAccepted} locale={locale} />}
                            />
                        </dl>
                        {offer.userDeclinationReason || offer.cookDeclinationReason ? (
                            <dl className="grid gap-4 border-t border-border pt-4">
                                {offer.userDeclinationReason ? (
                                    <DetailField
                                        label={{ de: 'Ablehnungsgrund Kunde', en: 'Customer decline reason' }[locale]}
                                        value={offer.userDeclinationReason}
                                    />
                                ) : null}
                                {offer.cookDeclinationReason ? (
                                    <DetailField
                                        label={{ de: 'Ablehnungsgrund Koch', en: 'Cook decline reason' }[locale]}
                                        value={offer.cookDeclinationReason}
                                    />
                                ) : null}
                            </dl>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            <AdminQueuedJobsSection jobs={offer.queuedJobs} />
        </div>
    );
}

type PayoutConfirmAction = 'release' | 'outOfSystem' | 'alreadyTookPlaceCheck';

function CostsTabPanel({
    offer,
    request,
    locale,
    timeZone,
}: {
    offer: GqlCAdminBookingRequestOfferPageOfferFragment;
    request: GqlCAdminBookingRequestOfferPageRequestFragment | null;
    locale: Locale;
    timeZone: string;
}) {
    const [, payoutRelease] = useMutation(AdminBookingRequestOfferPayoutReleaseDocument);
    const [, payoutMarkOutOfSystem] = useMutation(AdminBookingRequestOfferPayoutMarkOutOfSystemDocument);
    const [, payoutAlreadyTookPlaceCheck] = useMutation(AdminBookingRequestOfferPayoutAlreadyTookPlaceCheckDocument);
    const [payoutBusy, setPayoutBusy] = useState(false);
    const [payoutConfirm, setPayoutConfirm] = useState<PayoutConfirmAction | null>(null);

    const due = offerPayoutDue(offer);
    const done = offerPayoutDone(offer);
    const alreadyTookPlaceCheckable = offerPayoutAlreadyTookPlaceCheckable(offer);
    const outOfSystem = offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM';
    const empty = { de: '—', en: '—' }[locale];
    const platformWinCents = offer.platformFeeCentsCook + offer.platformFeeCentsCustomer;
    const customerTotalCents = offer.totalCentsCustomer ?? offer.totalWithoutDiscountsCentsCustomer;
    const payoutAmountLabel = money(offer.payoutCentsCook, locale);

    async function onPayoutRelease() {
        if (payoutBusy || !due || !offer.cookPayoutReady) return;
        setPayoutBusy(true);
        try {
            const result = await payoutRelease({ bookingRequestOfferId: offer.bookingRequestOfferId });
            if (!result.data?.admin.bookingRequestOfferPayoutRelease.success) {
                throw new Error('payout release failed');
            }
            toast.success({ de: 'Auszahlung ausgelöst.', en: 'Payout released.' }[locale]);
            setPayoutConfirm(null);
        } catch {
            toast.error({ de: 'Auszahlung fehlgeschlagen.', en: 'Could not release the payout.' }[locale]);
        } finally {
            setPayoutBusy(false);
        }
    }

    async function onPayoutMarkOutOfSystem() {
        if (payoutBusy || !due) return;
        setPayoutBusy(true);
        try {
            const result = await payoutMarkOutOfSystem({ bookingRequestOfferId: offer.bookingRequestOfferId });
            if (!result.data?.admin.bookingRequestOfferPayoutMarkOutOfSystem.success) {
                throw new Error('payout mark out of system failed');
            }
            toast.success({ de: 'Als außerbetrieblich ausgezahlt markiert.', en: 'Marked as paid out of system.' }[locale]);
            setPayoutConfirm(null);
        } catch {
            toast.error({ de: 'Markierung fehlgeschlagen.', en: 'Could not mark as paid out of system.' }[locale]);
        } finally {
            setPayoutBusy(false);
        }
    }

    async function onPayoutAlreadyTookPlaceCheck() {
        if (payoutBusy || !alreadyTookPlaceCheckable) return;
        setPayoutBusy(true);
        try {
            const result = await payoutAlreadyTookPlaceCheck({ bookingRequestOfferId: offer.bookingRequestOfferId });
            if (result.error) {
                throw new Error('payout already took place check failed');
            }
            if (!result.data?.admin.bookingRequestOfferPayoutAlreadyTookPlaceCheck.success) {
                toast.error(
                    {
                        de: 'Keine passende Stripe-Auszahlung gefunden.',
                        en: 'No matching Stripe payout found.',
                    }[locale],
                );
                return;
            }
            toast.success(
                outOfSystem
                    ? {
                          de: 'Passende Stripe-Auszahlung gefunden. Status von außerbetrieblich auf Stripe-Auszahlung korrigiert.',
                          en: 'Matching Stripe payout found. Corrected from out-of-system to Stripe payout.',
                      }[locale]
                    : {
                          de: 'Passende Stripe-Auszahlung gefunden. Als ausgezahlt markiert.',
                          en: 'Matching Stripe payout found. Marked as paid out.',
                      }[locale],
            );
            setPayoutConfirm(null);
        } catch {
            toast.error(
                {
                    de: 'Prüfung fehlgeschlagen.',
                    en: 'Could not check whether the payout already took place.',
                }[locale],
            );
        } finally {
            setPayoutBusy(false);
        }
    }

    return (
        <div className="@container grid max-w-4xl gap-4">
            {offer.isPriceAutoAdjusted ? (
                <StatusAlert tone="info" title={{ de: 'Preis automatisch angepasst', en: 'Price auto-adjusted' }[locale]}>
                    {
                        {
                            de: 'Dieser Angebotspreis wurde automatisch angepasst (z. B. nach einer Anfrageänderung).',
                            en: 'This offer price was adjusted automatically (for example after a request change).',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            {due ? (
                <Card className="gap-4 py-4">
                    <CardHeader className="px-4 pb-0">
                        <CardTitle className="text-sm">{{ de: 'Koch-Auszahlung', en: 'Cook payout' }[locale]}</CardTitle>
                        <CardDescription>
                            {
                                {
                                    de: `Fällig seit ${offer.plannedPayoutDateTime ? formatDate(offer.plannedPayoutDateTime, { locale, timeZone, dateStyle: 'medium' }) : '—'} · ${payoutAmountLabel}`,
                                    en: `Due since ${offer.plannedPayoutDateTime ? formatDate(offer.plannedPayoutDateTime, { locale, timeZone, dateStyle: 'medium' }) : '—'} · ${payoutAmountLabel}`,
                                }[locale]
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 px-4">
                        {!offer.cookPayoutReady ? (
                            <StatusAlert tone="warning" title={{ de: 'Auszahlung blockiert', en: 'Payout blocked' }[locale]}>
                                {cookPayoutBlockedReasonMessage(offer.cookPayoutBlockedReason, locale)}
                            </StatusAlert>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                disabled={payoutBusy || !offer.cookPayoutReady}
                                onClick={() => setPayoutConfirm('release')}
                            >
                                {{ de: 'Auszahlung freigeben', en: 'Release payout' }[locale]}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={payoutBusy}
                                onClick={() => setPayoutConfirm('alreadyTookPlaceCheck')}
                            >
                                {
                                    {
                                        de: 'Prüfen, ob Auszahlung bereits erfolgt',
                                        en: 'Check if payout already took place',
                                    }[locale]
                                }
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={payoutBusy}
                                onClick={() => setPayoutConfirm('outOfSystem')}
                            >
                                {{ de: 'Außerhalb von Stripe markieren', en: 'Mark paid out of system' }[locale]}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : null}
            {done ? (
                <StatusAlert
                    tone="success"
                    title={{ de: 'Auszahlung erledigt', en: 'Payout completed' }[locale]}
                    action={
                        outOfSystem ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={payoutBusy}
                                onClick={() => setPayoutConfirm('alreadyTookPlaceCheck')}
                            >
                                {
                                    {
                                        de: 'Prüfen, ob Auszahlung bereits erfolgt',
                                        en: 'Check if payout already took place',
                                    }[locale]
                                }
                            </Button>
                        ) : undefined
                    }
                >
                    {
                        {
                            de: outOfSystem
                                ? 'Als außerbetrieblich ausgezahlt markiert. Optional prüfen, ob Stripe bereits ausgezahlt hat.'
                                : 'Stripe-Auszahlung auf das Koch-Konto ausgelöst.',
                            en: outOfSystem
                                ? 'Marked as paid out of system. Optionally check whether Stripe already paid out.'
                                : 'Stripe bank payout to the cook was released.',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            <AlertDialog
                open={payoutConfirm != null}
                onOpenChange={(open) => {
                    if (!open && !payoutBusy) setPayoutConfirm(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {
                                (
                                    {
                                        release: {
                                            de: 'Auszahlung wirklich freigeben?',
                                            en: 'Really release this payout?',
                                        },
                                        alreadyTookPlaceCheck: {
                                            de: 'Prüfen, ob Auszahlung bereits erfolgt?',
                                            en: 'Check if payout already took place?',
                                        },
                                        outOfSystem: {
                                            de: 'Außerhalb von Stripe markieren?',
                                            en: 'Mark as paid out of system?',
                                        },
                                    } as const
                                )[payoutConfirm ?? 'release'][locale]
                            }
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                (
                                    {
                                        release: {
                                            de: `Es wird eine Stripe-Auszahlung über ${payoutAmountLabel} an den Koch ausgelöst.`,
                                            en: `This creates a Stripe bank payout of ${payoutAmountLabel} to the cook.`,
                                        },
                                        alreadyTookPlaceCheck: outOfSystem
                                            ? {
                                                  de: `Wir fragen Stripe nach einer passenden Auszahlung über ${payoutAmountLabel}. Wird eine gefunden, korrigieren wir den Status von außerbetrieblich auf Stripe-Auszahlung. Es wird keine neue Auszahlung erstellt.`,
                                                  en: `We ask Stripe for a matching payout of ${payoutAmountLabel}. If one is found, we correct the status from out-of-system to Stripe payout. No new payout is created.`,
                                              }
                                            : {
                                                  de: `Wir fragen Stripe nach einer passenden Auszahlung über ${payoutAmountLabel}. Wird eine gefunden, markieren wir das Angebot als ausgezahlt. Es wird keine neue Auszahlung erstellt.`,
                                                  en: `We ask Stripe for a matching payout of ${payoutAmountLabel}. If one is found, we mark the offer as paid out. No new payout is created.`,
                                              },
                                        outOfSystem: {
                                            de: `Keine Stripe-Auszahlung. Wir markieren ${payoutAmountLabel} als außerhalb von Stripe ausgezahlt (z. B. Überweisung oder Bargeld).`,
                                            en: `No Stripe payout. We mark ${payoutAmountLabel} as paid outside Stripe (for example wire or cash).`,
                                        },
                                    } as const
                                )[payoutConfirm ?? 'release'][locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={payoutBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={payoutBusy || (payoutConfirm === 'release' && !offer.cookPayoutReady)}
                            onClick={(event) => {
                                event.preventDefault();
                                if (payoutConfirm === 'release') void onPayoutRelease();
                                else if (payoutConfirm === 'alreadyTookPlaceCheck') void onPayoutAlreadyTookPlaceCheck();
                                else if (payoutConfirm === 'outOfSystem') void onPayoutMarkOutOfSystem();
                            }}
                        >
                            {payoutBusy
                                ? payoutConfirm === 'alreadyTookPlaceCheck'
                                    ? { de: 'Wird geprüft…', en: 'Checking…' }[locale]
                                    : { de: 'Wird gespeichert…', en: 'Saving…' }[locale]
                                : (
                                      {
                                          release: { de: 'Auszahlung freigeben', en: 'Release payout' },
                                          alreadyTookPlaceCheck: { de: 'Prüfen', en: 'Check' },
                                          outOfSystem: { de: 'Außerhalb markieren', en: 'Mark out of system' },
                                      } as const
                                  )[payoutConfirm ?? 'release'][locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="grid gap-4 @2xl:grid-cols-2">
                <Card className="gap-4 py-4">
                    <CardContent className="px-4">
                        <dl className="grid gap-3">
                            <EconomicsRow
                                label={{ de: 'Menüpreis', en: 'Menu price' }[locale]}
                                value={money(offer.menuPriceCents, locale)}
                            />
                            <EconomicsRow
                                label={{ de: 'Reisekosten', en: 'Travel expenses' }[locale]}
                                value={money(offer.travelExpensesCents, locale)}
                            />
                            <EconomicsRow
                                label={{ de: 'Reiseentfernung', en: 'Travel distance' }[locale]}
                                value={offer.travelDistanceKm != null ? `${offer.travelDistanceKm.toFixed(1)} km` : empty}
                            />
                            <Separator />
                            <EconomicsRow
                                label={
                                    {
                                        de: `Plattformgebühr Koch (${offer.platformFeePercentCook} %)`,
                                        en: `Platform fee cook (${offer.platformFeePercentCook}%)`,
                                    }[locale]
                                }
                                value={money(offer.platformFeeCentsCook, locale)}
                            />
                            <EconomicsRow
                                label={
                                    {
                                        de: `Plattformgebühr Kunde (${offer.platformFeePercentCustomer} %)`,
                                        en: `Platform fee customer (${offer.platformFeePercentCustomer}%)`,
                                    }[locale]
                                }
                                value={money(offer.platformFeeCentsCustomer, locale)}
                            />
                            <EconomicsRow
                                label={{ de: 'Zahlungsanbietergebühr', en: 'Payment provider fee' }[locale]}
                                value={money(offer.paymentProviderFeeCents, locale)}
                            />
                            <Separator />
                            <EconomicsRow
                                label={{ de: 'Koch-Auszahlung', en: 'Cook payout' }[locale]}
                                value={money(offer.payoutCentsCook, locale)}
                                emphasize
                            />
                            <EconomicsRow
                                label={{ de: 'Kundenpreis', en: 'Customer total' }[locale]}
                                value={money(customerTotalCents, locale)}
                                emphasize
                            />
                            <EconomicsRow
                                label={{ de: 'Plattformgewinn', en: 'Platform profit' }[locale]}
                                value={money(platformWinCents, locale)}
                                highlight="success"
                            />
                        </dl>
                    </CardContent>
                </Card>

                <Card className="gap-4 py-4">
                    <CardHeader className="px-4 pb-0">
                        <CardTitle className="text-sm">{{ de: 'Zahlung & Stripe', en: 'Payment & Stripe' }[locale]}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 px-4">
                        <DetailField label={{ de: 'Zahlungsstatus', en: 'Payment status' }[locale]} value={offer.paymentStatus} />
                        {offer.plannedPaymentPullDateTime ? (
                            <DetailField
                                label={{ de: 'Geplante Zahlung', en: 'Planned payment' }[locale]}
                                value={formatDate(offer.plannedPaymentPullDateTime, { locale, timeZone, dateStyle: 'medium' })}
                            />
                        ) : null}
                        {offer.paymentDateTime ? (
                            <DetailField
                                label={{ de: 'Bezahlt', en: 'Paid' }[locale]}
                                value={formatDate(offer.paymentDateTime, { locale, timeZone, dateStyle: 'medium' })}
                            />
                        ) : null}
                        {offer.plannedPayoutDateTime ? (
                            <DetailField
                                label={{ de: 'Geplante Auszahlung', en: 'Planned payout' }[locale]}
                                value={formatDate(offer.plannedPayoutDateTime, { locale, timeZone, dateStyle: 'medium' })}
                            />
                        ) : null}
                        {offer.payoutDateTime ? (
                            <DetailField
                                label={{ de: 'Ausgezahlt', en: 'Paid out' }[locale]}
                                value={formatDate(offer.payoutDateTime, { locale, timeZone, dateStyle: 'medium' })}
                            />
                        ) : null}
                        {offer.stripePaymentIntentUrl || offer.stripeSetupIntentUrl ? (
                            <div className="grid gap-2 pt-1">
                                {offer.stripePaymentIntentUrl ? (
                                    <a
                                        href={offer.stripePaymentIntentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                                    >
                                        {{ de: 'Payment Intent in Stripe', en: 'Payment Intent in Stripe' }[locale]}
                                        <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden />
                                    </a>
                                ) : null}
                                {offer.stripeSetupIntentUrl ? (
                                    <a
                                        href={offer.stripeSetupIntentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                                    >
                                        {{ de: 'Setup Intent in Stripe', en: 'Setup Intent in Stripe' }[locale]}
                                        <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden />
                                    </a>
                                ) : null}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {
                                    {
                                        de: 'Noch keine Stripe Payment- oder Setup-Intent-IDs gespeichert.',
                                        en: 'No Stripe Payment or Setup Intent ids stored yet.',
                                    }[locale]
                                }
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <OfferCostViews offer={offer} request={request} locale={locale} />
        </div>
    );
}

function MenuTabPanel({ offer, locale }: { offer: GqlCAdminBookingRequestOfferPageOfferFragment; locale: Locale }) {
    if (offer.configuredMenu) {
        return (
            <div className="@container grid max-w-4xl gap-4">
                <Card className="gap-4 py-4">
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-4 pb-0">
                        <CardTitle className="text-sm">{{ de: 'Konfiguriertes Menü', en: 'Configured menu' }[locale]}</CardTitle>
                        <Button type="button" size="sm" variant="outline" asChild>
                            <Link
                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/edit-configured-menu"
                                params={{
                                    bookingRequestId: offer.bookingRequestId,
                                    bookingRequestOfferId: offer.bookingRequestOfferId,
                                }}
                            >
                                {{ de: 'Menü bearbeiten', en: 'Edit menu' }[locale]}
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="px-4">
                        <OfferMenuConfigured menu={offer.configuredMenu} />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (offer.suggestedMenus.length > 0) {
        return (
            <div className="@container grid max-w-4xl gap-3">
                <h2 className="text-sm font-medium text-foreground">{{ de: 'Vorgeschlagene Menüs', en: 'Suggested menus' }[locale]}</h2>
                <ul className="grid grid-cols-1 gap-3 @md:grid-cols-2">
                    {offer.suggestedMenus.map((menu) => (
                        <li key={menu.menuId} className="min-w-0">
                            <CookMenuCard
                                menu={{
                                    title: menu.title,
                                    description: menu.description,
                                    courseCount: menu.courses.length,
                                    courseMealOptionImages: menu.courseMealOptionImages,
                                }}
                                showStatusBadge={false}
                                density="compact"
                                to="/{-$locale}/admin/menus/$menuId"
                                params={{ menuId: menu.menuId }}
                            />
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <Card className="max-w-4xl gap-4 py-4">
            <CardContent className="px-4">
                <p className="text-sm text-muted-foreground">{{ de: 'Kein Menü hinterlegt.', en: 'No menu on this offer.' }[locale]}</p>
            </CardContent>
        </Card>
    );
}
