import { Link, notFound, useNavigate } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import {
    FileTextIcon,
    MapPinIcon,
    MessageSquareIcon,
    MoreHorizontalIcon,
    SquareArrowOutUpRightIcon,
    StarIcon,
    VideoIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { bookingRequestOfferChatCanSend } from '../../../shared';
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
import { Card, CardContent } from '../../components/base/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { StatusAlert } from '../../components/base/status-alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/base/tabs';
import { BookingRequestDiscountEditor } from '../../components/BookingRequestDiscountEditor';
import { BookingRequestOfferAttentionBanner } from '../../components/BookingRequestOfferAttentionBanner';
import { BookingRequestOfferCallControls } from '../../components/BookingRequestOfferCallPanel';
import { BookingRequestOfferCallSessionProvider } from '../../components/BookingRequestOfferCallSession';
import { BookingRequestOfferCallTab } from '../../components/BookingRequestOfferCallTab';
import { BookingRequestOfferChat } from '../../components/BookingRequestOfferChat';
import { BookingRequestOfferParticipantAmendmentCustomerPanel } from '../../components/BookingRequestOfferParticipantAmendmentPanel';
import { bookingRequestOfferStatusClassName, bookingRequestOfferStatusLabel } from '../../components/bookingRequestOfferStatus';
import { BookingRequestOfferTestimonialPanel } from '../../components/BookingRequestOfferTestimonialPanel';
import { BookingStatusPill } from '../../components/BookingStatusPill';
import { CookProfileTags } from '../../components/CookProfileTags';
import { CostBreakdownPanel } from '../../components/CostBreakdownPanel';
import { CustomerBookingRequestOfferDeclineDialog } from '../../components/CustomerBookingRequestOfferDeclineDialog';
import { ExpandableText } from '../../components/ExpandableText';
import { OfferMenuConfiguration, offerMenuDefaultSelections } from '../../components/OfferMenuConfiguration';
import type { OfferMenuCourseSelection } from '../../components/OfferMenuConfiguration';
import { OfferMenuConfigured } from '../../components/OfferMenuConfigured';
import { OfferSuggestedMenuCard } from '../../components/OfferSuggestedMenuCard';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type {
    GqlCProfileCustomerBookingRequestOfferPageQuery,
    GqlCProfileCustomerBookingRequestOfferPageUserFragment,
} from '../../graphql/generated';
import {
    ProfileBookingRequestDiscountUpdateDocument,
    ProfileCustomerBookingRequestOfferAcceptDocument,
    ProfileCustomerBookingRequestOfferCallCreateDocument,
    ProfileCustomerBookingRequestOfferCallJoinDocument,
    ProfileCustomerBookingRequestOfferCallLeaveDocument,
    ProfileCustomerBookingRequestOfferCallSlotCancelDocument,
    ProfileCustomerBookingRequestOfferCallSlotConfirmDocument,
    ProfileCustomerBookingRequestOfferCallSlotDeclineDocument,
    ProfileCustomerBookingRequestOfferCallSlotRequestDocument,
    ProfileCustomerBookingRequestOfferChatMessageCreateDocument,
    ProfileCustomerBookingRequestOfferChatMessageReactionUpsertDocument,
    ProfileCustomerBookingRequestOfferConfiguredMenuCreateDocument,
    ProfileCustomerBookingRequestOfferPageUpdatesDocument,
    ProfileCustomerBookingRequestOfferParticipantAmendmentCancelDocument,
    ProfileCustomerBookingRequestOfferUnreadNotificationCountResetDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { bookingPaymentPullIsPast } from '../../utils/bookingPaymentPullIsPast';
import { cn } from '../../utils/cn';
import type { Locale } from '../../utils/locale';

export {
    profileCustomerBookingRequestOfferPageDescription,
    profileCustomerBookingRequestOfferPageTitle,
} from './profileCustomerBookingRequestOfferLabels';

const OFFER_TABS = ['offer', 'chat', 'call', 'testimonial'] as const;

export type ProfileCustomerBookingRequestOfferTab = (typeof OFFER_TABS)[number];

export type ProfileCustomerBookingRequestOfferSearch = {
    tab?: ProfileCustomerBookingRequestOfferTab;
};

function isOfferTab(value: unknown): value is ProfileCustomerBookingRequestOfferTab {
    return typeof value === 'string' && (OFFER_TABS as readonly string[]).includes(value);
}

export function parseProfileCustomerBookingRequestOfferSearch(search: Record<string, unknown>): ProfileCustomerBookingRequestOfferSearch {
    // Legacy `schedule` deep links resolve to the merged Call tab.
    const raw = search.tab === 'schedule' ? 'call' : search.tab;
    const tab = isOfferTab(raw) ? raw : undefined;
    return { tab };
}

function resolveOfferTab(
    tab: ProfileCustomerBookingRequestOfferTab | undefined,
    visible: ReadonlySet<ProfileCustomerBookingRequestOfferTab>,
    preferTestimonial: boolean,
): ProfileCustomerBookingRequestOfferTab {
    if (tab && isOfferTab(tab) && visible.has(tab)) return tab;
    if (preferTestimonial && visible.has('testimonial')) return 'testimonial';
    return 'offer';
}

type OfferTabDef = {
    id: ProfileCustomerBookingRequestOfferTab;
    label: Record<Locale, string>;
    Icon: LucideIcon;
};

const OFFER_TAB_DEFS: readonly OfferTabDef[] = [
    { id: 'offer', label: { de: 'Angebot', en: 'Offer' }, Icon: FileTextIcon },
    { id: 'chat', label: { de: 'Chat', en: 'Chat' }, Icon: MessageSquareIcon },
    { id: 'call', label: { de: 'Anruf', en: 'Call' }, Icon: VideoIcon },
    { id: 'testimonial', label: { de: 'Bewertung', en: 'Review' }, Icon: StarIcon },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function callSlotsRange(): { callSlotsFrom: string; callSlotsTo: string } {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 14 * MS_PER_DAY);
    return { callSlotsFrom: from.toISOString(), callSlotsTo: to.toISOString() };
}

type CustomerOffer = NonNullable<NonNullable<GqlCProfileCustomerBookingRequestOfferPageUserFragment['bookingRequest']>['offers']>[number];
type CustomerRequest = NonNullable<GqlCProfileCustomerBookingRequestOfferPageUserFragment['bookingRequest']>;

function OfferCostSummary({ offer, locale }: { offer: CustomerOffer; locale: Locale }) {
    return (
        <Card>
            <CardContent>
                <CostBreakdownPanel
                    locale={locale}
                    lineItems={offer.costBreakdown.lineItems}
                    totalBeforeDiscount={offer.costBreakdown.totalBeforeDiscount}
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
    );
}

export function profileCustomerBookingRequestOfferPageVariables(bookingRequestId: string) {
    return { bookingRequestId, ...callSlotsRange() };
}

export function ProfileCustomerBookingRequestOfferPage({
    data,
    search,
    bookingRequestId,
    bookingRequestOfferId,
}: {
    data: GqlCProfileCustomerBookingRequestOfferPageQuery;
    search: ProfileCustomerBookingRequestOfferSearch;
    bookingRequestId: string;
    bookingRequestOfferId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate({
        from: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
    });
    const seedUser = data.currentSession.user ?? null;
    const seedRequest = seedUser?.bookingRequest ?? null;
    const seedOffer = seedRequest?.offers.find((entry) => entry.bookingRequestOfferId === bookingRequestOfferId) ?? null;
    if (!seedRequest || !seedOffer) throw notFound();

    const callSlotsVars = useMemo(() => callSlotsRange(), []);
    const user = useUserUpdatesSeed(seedUser, ProfileCustomerBookingRequestOfferPageUpdatesDocument, {
        bookingRequestId,
        ...callSlotsVars,
    });
    const request = user?.bookingRequest ?? null;
    const offer = request?.offers.find((entry) => entry.bookingRequestOfferId === bookingRequestOfferId) ?? null;

    const [declineOpen, setDeclineOpen] = useState(false);
    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
    const [courseSelections, setCourseSelections] = useState<OfferMenuCourseSelection[]>([]);
    const [acceptOpen, setAcceptOpen] = useState(false);
    const [acceptBusy, setAcceptBusy] = useState(false);
    const [openCheckoutAfterAccept, setOpenCheckoutAfterAccept] = useState(false);

    const [, acceptOffer] = useMutation(ProfileCustomerBookingRequestOfferAcceptDocument);
    const [, configureMenu] = useMutation(ProfileCustomerBookingRequestOfferConfiguredMenuCreateDocument);
    const [, sendOfferChatMessage] = useMutation(ProfileCustomerBookingRequestOfferChatMessageCreateDocument);
    const [, upsertOfferChatReaction] = useMutation(ProfileCustomerBookingRequestOfferChatMessageReactionUpsertDocument);
    const [, resetUnread] = useMutation(ProfileCustomerBookingRequestOfferUnreadNotificationCountResetDocument);
    const [{ fetching: amendmentCancelBusy }, cancelAmendment] = useMutation(
        ProfileCustomerBookingRequestOfferParticipantAmendmentCancelDocument,
    );

    useEffect(() => {
        if (user == null) return;
        if (request == null || offer == null) {
            void navigate({
                to: '/{-$locale}/profile/booking-requests/$bookingRequestId',
                params: { bookingRequestId },
            });
        }
    }, [bookingRequestId, navigate, offer, request, user]);

    const configureMenus = useMemo(() => offer?.suggestedMenus ?? [], [offer?.suggestedMenus]);

    const showSchedule = offer != null && (offer.cook.callSchedulingEnabled || offer.callBookings.length > 0);
    const pendingIncomingCall = offer?.callBookings.find((booking) => booking.status === 'PENDING' && booking.initiator === 'COOK');
    const confirmedUpcomingCall = offer?.callBookings.find((booking) => booking.status === 'CONFIRMED');
    const visibleTabs = useMemo(() => {
        const ids = new Set<ProfileCustomerBookingRequestOfferTab>(['offer', 'chat', 'call']);
        if (offer == null) return ids;
        if (offer.status === 'COMPLETED' || offer.testimonialMissing || offer.customerTestimonial != null) {
            ids.add('testimonial');
        }
        return ids;
    }, [offer]);
    const tab = resolveOfferTab(search.tab, visibleTabs, offer?.testimonialMissing ?? false);
    const visibleTabDefs = OFFER_TAB_DEFS.filter((entry) => visibleTabs.has(entry.id));
    const testimonialTabMissing = offer?.testimonialMissing ?? false;

    useEffect(() => {
        if (offer == null) return;
        if ((tab !== 'chat' && tab !== 'call') || offer.userUnreadNotificationCount <= 0) return;
        void resetUnread({ bookingRequestOfferId });
    }, [tab, bookingRequestOfferId, offer, resetUnread]);

    const canAccept = offer?.status === 'USER_NEEDS_TO_ACCEPT';
    const canDecline = offer?.status === 'USER_NEEDS_TO_ACCEPT' || offer?.status === 'COOK_NEEDS_TO_ACCEPT';
    const canConfigure =
        offer != null &&
        (offer.status === 'USER_NEEDS_TO_ACCEPT' || offer.status === 'COOK_NEEDS_TO_ACCEPT') &&
        offer.suggestedMenus.length > 0 &&
        offer.configuredMenu == null;
    const needsDepositPayment = offer?.status === 'USER_NEEDS_DEPOSIT_PAYMENT';
    const needsAmendmentDeltaPayment = offer != null && offer.paymentStatus === 'PAYED' && offer.payment != null;
    const canPay = offer != null && offer.payment != null && (offer.status === 'USER_NEEDS_DEPOSIT_PAYMENT' || needsAmendmentDeltaPayment);
    const paymentUnavailable = offer != null && offer.status === 'USER_NEEDS_DEPOSIT_PAYMENT' && offer.payment == null;
    const pullIsPast = bookingPaymentPullIsPast(offer?.plannedPaymentPullDateTime);
    const isSetupIntent = offer?.payment?.type === 'SETUP_INTENT';
    const canSend = offer != null && bookingRequestOfferChatCanSend(offer.status);

    useEffect(() => {
        if (offer == null) return;
        if (offer.configuredMenu != null || configureMenus.length === 0) return;
        const stillValid = selectedMenuId != null && configureMenus.some((menu) => menu.menuId === selectedMenuId);
        if (stillValid) return;
        const firstMenu = configureMenus[0]!;
        setSelectedMenuId(firstMenu.menuId);
        setCourseSelections(offerMenuDefaultSelections(firstMenu));
    }, [configureMenus, offer, selectedMenuId]);

    function selectConfigureMenu(menuId: string) {
        const menu = configureMenus.find((entry) => entry.menuId === menuId);
        if (menu == null) return;
        setSelectedMenuId(menuId);
        setCourseSelections(offerMenuDefaultSelections(menu));
    }

    useEffect(() => {
        if (offer == null) return;
        if (!openCheckoutAfterAccept) return;
        if (canPay) {
            void navigate({
                to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/checkout',
                params: { bookingRequestId, bookingRequestOfferId },
            });
            setOpenCheckoutAfterAccept(false);
            return;
        }
        if (paymentUnavailable) {
            toast.error(
                {
                    de: 'Zahlung vorbereitet, aber Checkout ist nicht verfügbar (fehlender Stripe Publishable Key).',
                    en: 'Payment prepared, but checkout is unavailable (missing Stripe publishable key).',
                }[locale],
            );
            setOpenCheckoutAfterAccept(false);
            return;
        }
        // Dual-accepted with no deposit step (€0 gift/promo → already PAYED).
        if (offer.userAccepted === true && !needsDepositPayment) {
            setOpenCheckoutAfterAccept(false);
        }
    }, [
        bookingRequestId,
        bookingRequestOfferId,
        canPay,
        locale,
        navigate,
        needsDepositPayment,
        openCheckoutAfterAccept,
        paymentUnavailable,
        offer?.userAccepted,
    ]);

    if (request == null || offer == null) {
        return null;
    }

    const liveOffer = offer;
    const showOfferAcceptFooter = tab === 'offer' && canAccept;

    async function onAcceptConfirm() {
        if (acceptBusy) return;
        setAcceptBusy(true);
        try {
            if (liveOffer.suggestedMenus.length > 0 && liveOffer.configuredMenu == null) {
                if (selectedMenuId == null) {
                    throw new Error('menu selection required');
                }
                const configured = await configureMenu({
                    bookingRequestOfferId,
                    menuId: selectedMenuId,
                    courseSelections,
                });
                if (!configured.data?.user.bookingRequestOfferConfiguredMenuCreate.success) {
                    throw new Error('configure failed');
                }
            }
            const result = await acceptOffer({ bookingRequestOfferId });
            if (!result.data?.user.bookingRequestOfferAccept.success) {
                throw new Error('accept failed');
            }
            setAcceptOpen(false);
            setOpenCheckoutAfterAccept(true);
            toast.success({ de: 'Angebot angenommen.', en: 'Offer accepted.' }[locale]);
        } catch {
            toast.error({ de: 'Annahme fehlgeschlagen.', en: 'Could not accept the offer.' }[locale]);
        } finally {
            setAcceptBusy(false);
        }
    }

    return (
        <BookingRequestOfferCallSessionProvider
            bookingRequestOfferId={bookingRequestOfferId}
            createDocument={ProfileCustomerBookingRequestOfferCallCreateDocument}
            joinDocument={ProfileCustomerBookingRequestOfferCallJoinDocument}
            leaveDocument={ProfileCustomerBookingRequestOfferCallLeaveDocument}
        >
            {(call) => (
                <ProfilePinnedFooterLayout
                    className="@container min-w-0"
                    contentScroll={false}
                    contentClassName="flex w-full min-w-0 flex-col pb-0"
                    footer={
                        call.inCall ? (
                            <BookingRequestOfferCallControls />
                        ) : showOfferAcceptFooter ? (
                            <Button type="button" disabled={acceptBusy} onClick={() => setAcceptOpen(true)}>
                                {{ de: 'Annehmen', en: 'Accept' }[locale]}
                            </Button>
                        ) : undefined
                    }
                >
                    <div className="grid shrink-0 gap-2 px-4">
                        <div className="flex items-center justify-end gap-2">
                            <BookingStatusPill className={bookingRequestOfferStatusClassName(offer.status)}>
                                {bookingRequestOfferStatusLabel(offer.status, locale, 'customer')}
                            </BookingStatusPill>
                            {canDecline ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label={{ de: 'Weitere Aktionen', en: 'More actions' }[locale]}
                                        >
                                            <MoreHorizontalIcon className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem variant="destructive" onSelect={() => setDeclineOpen(true)}>
                                            {{ de: 'Ablehnen', en: 'Decline' }[locale]}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : null}
                        </div>
                        {offer.status === 'COOK_NEEDS_TO_ACCEPT' ? (
                            <StatusAlert
                                tone="info"
                                title={{ de: 'Koch muss deine Änderungen bestätigen', en: 'Chef must confirm your changes' }[locale]}
                            >
                                {
                                    {
                                        de: 'Als Nächstes bestätigt der Koch deine Änderungen an der Anfrage. Danach kannst du das Angebot wieder annehmen.',
                                        en: 'Next, the chef confirms your changes to the request. After that you can accept the offer again.',
                                    }[locale]
                                }
                            </StatusAlert>
                        ) : null}
                        {needsDepositPayment ? (
                            <BookingRequestOfferAttentionBanner
                                message={
                                    {
                                        de: isSetupIntent
                                            ? pullIsPast
                                                ? 'Zahlungsdaten ausstehend: bitte hinterlegen (Abbuchung danach sofort)'
                                                : 'Zahlungsdaten ausstehend: bitte hinterlegen'
                                            : 'Zahlung ausstehend: bitte Checkout abschließen',
                                        en: isSetupIntent
                                            ? pullIsPast
                                                ? 'Payment details pending: please save your card (charged right after)'
                                                : 'Payment details pending: please save your card'
                                            : 'Payment pending: please complete checkout',
                                    }[locale]
                                }
                                actionLabel={{ de: 'Zum Checkout', en: 'Go to checkout' }[locale]}
                                actionLink={
                                    canPay
                                        ? {
                                              to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/checkout',
                                              params: { bookingRequestId, bookingRequestOfferId },
                                          }
                                        : undefined
                                }
                            />
                        ) : null}
                        {pendingIncomingCall && showSchedule ? (
                            <BookingRequestOfferAttentionBanner
                                message={
                                    {
                                        de: 'Terminvorschlag vom Koch: bitte bestätigen oder ablehnen',
                                        en: 'Call suggestion from the chef: please confirm or decline',
                                    }[locale]
                                }
                                actionLabel={{ de: 'Zum Anruf', en: 'View call' }[locale]}
                                actionLink={
                                    tab !== 'call'
                                        ? {
                                              to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
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
                                            to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                            params={{ bookingRequestId, bookingRequestOfferId }}
                                            search={{
                                                tab:
                                                    id === 'testimonial' && testimonialTabMissing
                                                        ? undefined
                                                        : id === 'offer' && !testimonialTabMissing
                                                          ? undefined
                                                          : id,
                                            }}
                                            replace
                                        >
                                            <Icon aria-hidden />
                                            {label[locale]}
                                            {id === 'testimonial' && testimonialTabMissing ? (
                                                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-medium">
                                                    1
                                                </Badge>
                                            ) : null}
                                        </Link>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <TabsContent value="chat" className="mt-4 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
                            {offer.activeCallRoom?.status === 'ACTIVE' ||
                            (!pendingIncomingCall && confirmedUpcomingCall && showSchedule) ? (
                                <div className="grid shrink-0 gap-3 px-4">
                                    {offer.activeCallRoom?.status === 'ACTIVE' ? (
                                        <StatusAlert
                                            tone="info"
                                            title={{ de: 'Anruf läuft', en: 'Call in progress' }[locale]}
                                            action={
                                                <Button type="button" size="sm" asChild>
                                                    <Link
                                                        to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
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
                                    {!pendingIncomingCall && confirmedUpcomingCall && showSchedule ? (
                                        <StatusAlert
                                            tone="info"
                                            title={{ de: 'Gesprächstermin bestätigt', en: 'Discovery call confirmed' }[locale]}
                                            action={
                                                <Button type="button" size="sm" asChild>
                                                    <Link
                                                        to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
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
                                                    de: 'Dein bestätigter Termin erscheint unter Anruf.',
                                                    en: 'Your confirmed appointment is on the Call tab.',
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
                                    {
                                        display: offer.cook.user.display,
                                        profilePictureUrl: offer.cook.user.profilePicture?.url,
                                    },
                                ]}
                                viewerRole="customer"
                                onSend={async (message, fileUploadIds) => {
                                    const result = await sendOfferChatMessage({ bookingRequestOfferId, message, fileUploadIds });
                                    if (result.error || !result.data?.user.bookingRequestOfferChatMessageCreate.success) {
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
                                onReactMessage={async (chatMessageId, emoji) => {
                                    const result = await upsertOfferChatReaction({
                                        bookingRequestOfferEventId: chatMessageId,
                                        emoji,
                                    });
                                    if (result.error || !result.data?.user.bookingRequestOfferChatMessageReactionUpsert.success) {
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
                            className="mt-4 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                        >
                            <OfferTabPanel
                                offer={offer}
                                request={request}
                                bookingRequestId={bookingRequestId}
                                bookingRequestOfferId={bookingRequestOfferId}
                                locale={locale}
                                canConfigure={canConfigure}
                                canPay={canPay}
                                paymentUnavailable={paymentUnavailable}
                                selectedMenuId={selectedMenuId}
                                courseSelections={courseSelections}
                                onSelectMenu={selectConfigureMenu}
                                onCourseSelectionsChange={setCourseSelections}
                                amendmentCancelBusy={amendmentCancelBusy}
                                onCancelAmendment={async () => {
                                    const result = await cancelAmendment({ bookingRequestOfferId });
                                    if (result.error || !result.data?.user.bookingRequestOfferParticipantAmendmentCancel.success) {
                                        toast.error(
                                            {
                                                de: 'Vorschlag konnte nicht zurückgezogen werden.',
                                                en: 'Could not withdraw the proposal.',
                                            }[locale],
                                        );
                                        return;
                                    }
                                    toast.success(
                                        {
                                            de: 'Vorschlag zurückgezogen.',
                                            en: 'Proposal withdrawn.',
                                        }[locale],
                                    );
                                }}
                            />
                        </TabsContent>

                        <TabsContent
                            value="call"
                            className="mt-4 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                        >
                            <BookingRequestOfferCallTab
                                role="user"
                                bookingRequestOfferId={bookingRequestOfferId}
                                callBookings={offer.callBookings}
                                activeCallRoom={offer.activeCallRoom ?? null}
                                showSchedule={showSchedule}
                                callSchedulingEnabled={offer.cook.callSchedulingEnabled}
                                callDurationMinutes={offer.cook.callDurationMinutes}
                                callSlots={offer.cook.callSlots}
                                peerDisplayName={offer.cook.user.display}
                                requestDocument={ProfileCustomerBookingRequestOfferCallSlotRequestDocument}
                                confirmDocument={ProfileCustomerBookingRequestOfferCallSlotConfirmDocument}
                                declineDocument={ProfileCustomerBookingRequestOfferCallSlotDeclineDocument}
                                cancelDocument={ProfileCustomerBookingRequestOfferCallSlotCancelDocument}
                            />
                        </TabsContent>

                        {visibleTabs.has('testimonial') ? (
                            <TabsContent
                                value="testimonial"
                                className="mt-4 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                            >
                                <BookingRequestOfferTestimonialPanel
                                    bookingRequestOfferId={bookingRequestOfferId}
                                    role="customer"
                                    existing={
                                        offer.customerTestimonial
                                            ? {
                                                  body: offer.customerTestimonial.body,
                                                  rating: offer.customerTestimonial.rating ?? null,
                                                  publicationStatus: undefined,
                                              }
                                            : null
                                    }
                                    missing={offer.testimonialMissing}
                                />
                            </TabsContent>
                        ) : null}
                    </Tabs>

                    <AlertDialog open={acceptOpen} onOpenChange={(open) => !acceptBusy && setAcceptOpen(open)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{{ de: 'Angebot akzeptieren', en: 'Accept offer' }[locale]}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Indem du das Angebot akzeptierst, werden das ausgewählte Menü sowie die Auswahl der Gerichte gespeichert und du wirst zur Zahlung weitergeleitet.',
                                            en: 'By accepting the offer, your selected menu and dish choices will be saved and you will be redirected to payment.',
                                        }[locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={acceptBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={acceptBusy}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        void onAcceptConfirm();
                                    }}
                                >
                                    {
                                        { de: acceptBusy ? 'Wird angenommen…' : 'Fortfahren', en: acceptBusy ? 'Accepting…' : 'Continue' }[
                                            locale
                                        ]
                                    }
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <CustomerBookingRequestOfferDeclineDialog
                        bookingRequestOfferId={bookingRequestOfferId}
                        open={declineOpen}
                        onClose={() => setDeclineOpen(false)}
                    />
                </ProfilePinnedFooterLayout>
            )}
        </BookingRequestOfferCallSessionProvider>
    );
}

function initialsFromDisplay(display: string): string {
    const parts = display.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function OfferTabPanel({
    offer,
    request,
    bookingRequestId,
    bookingRequestOfferId,
    locale,
    canConfigure,
    canPay,
    paymentUnavailable,
    selectedMenuId,
    courseSelections,
    onSelectMenu,
    onCourseSelectionsChange,
    amendmentCancelBusy,
    onCancelAmendment,
}: {
    offer: CustomerOffer;
    request: CustomerRequest;
    bookingRequestId: string;
    bookingRequestOfferId: string;
    locale: Locale;
    canConfigure: boolean;
    canPay: boolean;
    paymentUnavailable: boolean;
    selectedMenuId: string | null;
    courseSelections: OfferMenuCourseSelection[];
    onSelectMenu: (menuId: string) => void;
    onCourseSelectionsChange: (selections: OfferMenuCourseSelection[]) => void;
    amendmentCancelBusy: boolean;
    onCancelAmendment: () => Promise<void>;
}) {
    const [, updateDiscount] = useMutation(ProfileBookingRequestDiscountUpdateDocument);
    const cook = offer.cook;
    const biographyText =
        cook.biographySummary.trim().length > 0 ? cook.biographySummary : cook.biography.trim().length > 0 ? cook.biography : null;
    const dualAccepted = offer.userAccepted === true && offer.cookAccepted === true;
    const canEditDiscount = offer.paymentStatus === 'EMPTY' && !dualAccepted;
    const selectedMenu = offer.suggestedMenus.find((menu) => menu.menuId === selectedMenuId) ?? null;
    const hasMenu = offer.configuredMenu != null || canConfigure || offer.suggestedMenus.length > 0;
    const pullIsPast = bookingPaymentPullIsPast(offer.plannedPaymentPullDateTime);
    const isSetupIntent = offer.payment?.type === 'SETUP_INTENT';

    return (
        <div className={cn('grid gap-8', hasMenu && '@5xl:grid-cols-2 @5xl:items-start @5xl:gap-10')}>
            {offer.configuredMenu ? (
                <section className="grid min-w-0 gap-3">
                    <h2 className="font-serif text-2xl/tight text-foreground">{{ de: 'Menü', en: 'Menu' }[locale]}</h2>
                    <OfferMenuConfigured menu={offer.configuredMenu} />
                </section>
            ) : canConfigure || offer.suggestedMenus.length > 0 ? (
                <section className="grid min-w-0 gap-4">
                    <h2 className="font-serif text-2xl/tight text-foreground">{{ de: 'Menü', en: 'Menu' }[locale]}</h2>
                    {offer.suggestedMenus.length > 1 ? (
                        <ul className="grid grid-cols-1 gap-3" aria-label={{ de: 'Menüvorschläge', en: 'Suggested menus' }[locale]}>
                            {offer.suggestedMenus.map((menu) => (
                                <OfferSuggestedMenuCard
                                    key={menu.menuId}
                                    menu={{
                                        menuId: menu.menuId,
                                        title: menu.title,
                                        description: menu.description,
                                        courseCount: menu.courses.length,
                                        courseMealOptionImages: menu.courseMealOptionImages,
                                    }}
                                    selected={selectedMenuId === menu.menuId}
                                    disabled={!canConfigure}
                                    onSelect={onSelectMenu}
                                />
                            ))}
                        </ul>
                    ) : selectedMenu != null && canConfigure ? (
                        <h3 className="font-serif text-xl wrap-break-word text-foreground">{selectedMenu.title}</h3>
                    ) : null}
                    {selectedMenu != null ? (
                        canConfigure ? (
                            <OfferMenuConfiguration
                                menu={selectedMenu}
                                selections={courseSelections}
                                onSelectionsChange={onCourseSelectionsChange}
                            />
                        ) : (
                            <OfferMenuConfigured
                                menu={{
                                    title: selectedMenu.title,
                                    description: selectedMenu.description,
                                    courses: selectedMenu.courses.map((course) => ({
                                        title: course.title,
                                        meals: course.mealOptions.map((meal) => ({
                                            mealTitle: meal.title,
                                            mealDescription: meal.description,
                                            mealImageUrl: meal.imageUrl,
                                        })),
                                    })),
                                }}
                            />
                        )
                    ) : null}
                </section>
            ) : null}

            <div className="grid min-w-0 gap-8">
                <section className="grid gap-4">
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Dieses Angebot wurde dir geschickt von:',
                                en: 'This offer was sent to you by:',
                            }[locale]
                        }
                    </p>
                    <div className={cn('flex flex-col gap-4', cook.user.profilePicture != null && 'sm:flex-row sm:gap-6')}>
                        {cook.user.profilePicture != null ? (
                            <Avatar className="size-24 shrink-0 text-xl">
                                <AvatarImage src={cook.user.profilePicture.url} alt="" />
                                <AvatarFallback className="text-xl">{initialsFromDisplay(cook.user.display)}</AvatarFallback>
                            </Avatar>
                        ) : null}
                        <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="font-serif text-2xl/tight text-foreground">{cook.user.display}</h2>
                                {cook.hasPublicProfile ? (
                                    <Link
                                        to="/{-$locale}/chefs/$cookId"
                                        params={{ cookId: cook.cookId }}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex text-muted-foreground hover:text-foreground"
                                        aria-label={
                                            {
                                                de: 'Öffentliche Kochseite öffnen',
                                                en: 'Open public cook page',
                                            }[locale]
                                        }
                                    >
                                        <SquareArrowOutUpRightIcon aria-hidden className="size-4" />
                                    </Link>
                                ) : null}
                            </div>
                            {cook.city != null && cook.city.trim().length > 0 ? (
                                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <MapPinIcon aria-hidden className="size-4 shrink-0" />
                                    <span>{cook.city}</span>
                                </p>
                            ) : null}
                            <CookProfileTags cuisineStyle={cook.cuisineStyle} cookingPhilosophy={cook.cookingPhilosophy} />
                            {biographyText != null ? (
                                <ExpandableText className="text-sm text-muted-foreground">{biographyText}</ExpandableText>
                            ) : null}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4">
                    <h2 className="font-serif text-2xl/tight text-foreground">{{ de: 'Preisübersicht', en: 'Price overview' }[locale]}</h2>
                    <OfferCostSummary offer={offer} locale={locale} />
                    <BookingRequestOfferParticipantAmendmentCustomerPanel
                        locale={locale}
                        canRequest={offer.canRequestParticipantAmendment}
                        preparationsCompletedAt={offer.preparationsCompletedAt}
                        amendment={offer.participantAmendment}
                        bookingRequestId={bookingRequestId}
                        cancelBusy={amendmentCancelBusy}
                        onCancelAmendment={onCancelAmendment}
                    />

                    {canEditDiscount || request.promoCode != null || request.giftCard != null ? (
                        <BookingRequestDiscountEditor
                            bookingRequestId={bookingRequestId}
                            locale={locale}
                            canEdit={canEditDiscount}
                            promoCode={request.promoCode}
                            giftCard={request.giftCard}
                            onDiscountUpdate={async ({ bookingRequestId: id, redeemCode }) => {
                                const result = await updateDiscount({ bookingRequestId: id, redeemCode });
                                return result.data?.user.bookingRequestDiscountUpdate.success === true;
                            }}
                        />
                    ) : null}
                </section>

                {canPay ? (
                    <StatusAlert
                        tone="warning"
                        title={{ de: 'Zahlung ausstehend', en: 'Payment pending' }[locale]}
                        action={
                            <Button type="button" size="sm" asChild>
                                <Link
                                    to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/checkout"
                                    params={{ bookingRequestId, bookingRequestOfferId }}
                                >
                                    {
                                        {
                                            de: isSetupIntent ? 'Zahlungsdaten hinterlegen' : 'Jetzt bezahlen',
                                            en: isSetupIntent ? 'Add payment details' : 'Pay now',
                                        }[locale]
                                    }
                                </Link>
                            </Button>
                        }
                    >
                        {
                            {
                                de: isSetupIntent
                                    ? pullIsPast
                                        ? 'Bitte hinterlege deine Kartendaten. Wir belasten die Karte direkt danach.'
                                        : 'Bitte hinterlege deine Kartendaten, damit wir die Buchung vormerken können.'
                                    : 'Bitte schließe die Zahlung ab, um die Buchung zu bestätigen.',
                                en: isSetupIntent
                                    ? pullIsPast
                                        ? 'Please save your card details. We charge the card right after that.'
                                        : 'Please save your card details so we can reserve the booking.'
                                    : 'Please complete payment to confirm the booking.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : null}

                {paymentUnavailable ? (
                    <StatusAlert tone="error" title={{ de: 'Checkout nicht verfügbar', en: 'Checkout unavailable' }[locale]}>
                        {
                            {
                                de: 'Die Zahlung wurde vorbereitet, aber der Stripe Publishable Key fehlt in der Server-Konfiguration.',
                                en: 'Payment was prepared, but the Stripe publishable key is missing from the server configuration.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : null}
            </div>
        </div>
    );
}
