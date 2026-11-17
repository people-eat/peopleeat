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

import { t } from '../../../i18n/t';
import { bookingRequestOfferChatCanSend, formatBookingEventWhenFromCountry, timeZoneFromCountry, userDisplayName } from '../../../shared';
import { bookingRequestOfferStatusHue, bookingRequestOfferStatusLabel } from '../../../shared/bookingRequestOfferStatus';
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
import { Button } from '../../components/base/button';
import { Card, CardContent } from '../../components/base/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { NotificationBadge } from '../../components/base/notification-badge';
import { StatusAlert } from '../../components/base/status-alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/base/tabs';
import { BookingEventCalendarLink } from '../../components/BookingEventCalendarLink';
import { BookingRequestDiscountEditor } from '../../components/BookingRequestDiscountEditor';
import { BookingRequestOfferAddonSelectionList } from '../../components/BookingRequestOfferAddonSelectionList';
import { BookingRequestOfferAttentionBanner } from '../../components/BookingRequestOfferAttentionBanner';
import { BookingRequestOfferCallControls } from '../../components/BookingRequestOfferCallPanel';
import { BookingRequestOfferCallSessionProvider } from '../../components/BookingRequestOfferCallSession';
import { BookingRequestOfferCallTab } from '../../components/BookingRequestOfferCallTab';
import { BookingRequestOfferChat } from '../../components/BookingRequestOfferChat';
import { BookingRequestOfferParticipantAmendmentCustomerPanel } from '../../components/BookingRequestOfferParticipantAmendmentPanel';
import {
    BookingRequestOfferPaymentDocumentPanel,
    bookingRequestOfferPaymentDocumentVisible,
} from '../../components/BookingRequestOfferPaymentDocumentPanel';
import {
    BOOKING_REQUEST_OFFER_TESTIMONIAL_EDIT_FORM_ID,
    BOOKING_REQUEST_OFFER_TESTIMONIAL_FORM_ID,
    BookingRequestOfferTestimonialPanel,
} from '../../components/BookingRequestOfferTestimonialPanel';
import { BookingStatusPill } from '../../components/BookingStatusPill';
import { BookingWhenLabel } from '../../components/BookingWhenLabel';
import { CookProfileTags } from '../../components/CookProfileTags';
import { CostBreakdownPanel } from '../../components/CostBreakdownPanel';
import { CustomerBookingRequestOfferDeclineDialog } from '../../components/CustomerBookingRequestOfferDeclineDialog';
import { ExpandableText } from '../../components/ExpandableText';
import type { OfferMenuCourseSelection } from '../../components/OfferMenuConfiguration';
import { OfferMenuConfiguration, offerMenuDefaultSelections } from '../../components/OfferMenuConfiguration';
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
    ProfileCustomerBookingRequestOfferChatMessageDeleteDocument,
    ProfileCustomerBookingRequestOfferChatMessageReactionUpsertDocument,
    ProfileCustomerBookingRequestOfferConfiguredMenuCreateDocument,
    ProfileCustomerBookingRequestOfferCustomerReceiptRegenerateDocument,
    ProfileCustomerBookingRequestOfferPageUpdatesDocument,
    ProfileCustomerBookingRequestOfferParticipantAmendmentCancelDocument,
    ProfileCustomerBookingRequestOfferUnreadNotificationCountResetDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { bookingPaymentPullIsPast } from '../../utils/bookingPaymentPullIsPast';
import { cn } from '../../utils/cn';
import type { Locale } from '../../utils/locale';
import { localePath } from '../../utils/locale';

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
    Icon: LucideIcon;
};

const OFFER_TAB_DEFS: readonly OfferTabDef[] = [
    { id: 'offer', Icon: FileTextIcon },
    { id: 'chat', Icon: MessageSquareIcon },
    { id: 'call', Icon: VideoIcon },
    { id: 'testimonial', Icon: StarIcon },
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
                    footer={t(locale, 'profileCustomer', 'offer.travelIncluded')}
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
    const [testimonialBusy, setTestimonialBusy] = useState(false);
    const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);
    const [testimonialEditing, setTestimonialEditing] = useState(false);

    const [, acceptOffer] = useMutation(ProfileCustomerBookingRequestOfferAcceptDocument);
    const [, configureMenu] = useMutation(ProfileCustomerBookingRequestOfferConfiguredMenuCreateDocument);
    const [, sendOfferChatMessage] = useMutation(ProfileCustomerBookingRequestOfferChatMessageCreateDocument);
    const [, deleteChatMessage] = useMutation(ProfileCustomerBookingRequestOfferChatMessageDeleteDocument);
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
    const paymentFailed = offer?.paymentStatus === 'FAILED';
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
            toast.error(t(locale, 'profileCustomer', 'offer.checkoutKeyMissing'));
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
    const showTestimonialComposeFooter =
        tab === 'testimonial' &&
        offer != null &&
        offer.testimonialMissing &&
        offer.customerTestimonial == null &&
        !testimonialSubmitted &&
        !testimonialEditing;
    const showTestimonialEditFooter = tab === 'testimonial' && testimonialEditing;

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
            toast.success(t(locale, 'profileCustomer', 'offer.accepted'));
        } catch {
            toast.error(t(locale, 'profileCustomer', 'offer.acceptFailed'));
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
                        ) : showTestimonialEditFooter ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 md:flex-initial"
                                    disabled={testimonialBusy}
                                    onClick={() => setTestimonialEditing(false)}
                                >
                                    {t(locale, 'common', 'cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    form={BOOKING_REQUEST_OFFER_TESTIMONIAL_EDIT_FORM_ID}
                                    className="flex-1 md:flex-initial"
                                    disabled={testimonialBusy}
                                >
                                    {t(locale, 'common', 'save')}
                                </Button>
                            </>
                        ) : showTestimonialComposeFooter ? (
                            <Button type="submit" form={BOOKING_REQUEST_OFFER_TESTIMONIAL_FORM_ID} disabled={testimonialBusy}>
                                {t(locale, 'profileCustomer', 'offer.shareReview')}
                            </Button>
                        ) : showOfferAcceptFooter ? (
                            <Button type="button" disabled={acceptBusy} onClick={() => setAcceptOpen(true)}>
                                {t(locale, 'profileCustomer', 'offer.accept')}
                            </Button>
                        ) : undefined
                    }
                >
                    <div className="grid shrink-0 gap-2 px-4">
                        <div className="flex items-center justify-end gap-2">
                            <BookingStatusPill hue={bookingRequestOfferStatusHue(offer.status)}>
                                {bookingRequestOfferStatusLabel(offer.status, locale, 'customer')}
                            </BookingStatusPill>
                            {canDecline ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label={t(locale, 'profileCustomer', 'actions.moreActions')}
                                        >
                                            <MoreHorizontalIcon className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem variant="destructive" onSelect={() => setDeclineOpen(true)}>
                                            {t(locale, 'profileCustomer', 'offer.decline')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : null}
                        </div>
                        {offer.status === 'COOK_NEEDS_TO_ACCEPT' ? (
                            <StatusAlert tone="info" title={t(locale, 'profileCustomer', 'offer.chefMustConfirm')}>
                                {t(locale, 'profileCustomer', 'offer.chefMustConfirmBody')}
                            </StatusAlert>
                        ) : null}
                        {needsDepositPayment ? (
                            <BookingRequestOfferAttentionBanner
                                message={
                                    paymentFailed
                                        ? t(locale, 'profileCustomer', 'offer.paymentAttemptFailedBanner')
                                        : isSetupIntent
                                          ? pullIsPast
                                              ? t(locale, 'profileCustomer', 'offer.paymentDetailsPendingChargeSoon')
                                              : t(locale, 'profileCustomer', 'offer.paymentDetailsPending')
                                          : t(locale, 'profileCustomer', 'offer.paymentPendingCheckout')
                                }
                                actionLabel={t(locale, 'profileCustomer', 'offer.goToCheckout')}
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
                                message={t(locale, 'profileCustomer', 'offer.callSuggestion')}
                                actionLabel={t(locale, 'profileCustomer', 'offer.viewCall')}
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
                            <TabsList variant="line" className="shrink-0" aria-label={t(locale, 'profileCustomer', 'offer.sections')}>
                                {visibleTabDefs.map(({ id, Icon }) => (
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
                                            {t(locale, 'profileCustomer', `offer.tabs.${id}`)}
                                            {id === 'testimonial' && testimonialTabMissing ? (
                                                <NotificationBadge
                                                    count={1}
                                                    placement="inline"
                                                    className="ml-1"
                                                    label={t(locale, 'profileCustomer', 'offer.reviewOutstanding')}
                                                />
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
                                            title={t(locale, 'profileCustomer', 'offer.callInProgress')}
                                            action={
                                                <Button type="button" size="sm" asChild>
                                                    <Link
                                                        to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                                        params={{ bookingRequestId, bookingRequestOfferId }}
                                                        search={{ tab: 'call' }}
                                                        replace
                                                    >
                                                        {t(locale, 'profileCustomer', 'offer.goToCall')}
                                                    </Link>
                                                </Button>
                                            }
                                        >
                                            {t(locale, 'profileCustomer', 'offer.videoCallActive')}
                                        </StatusAlert>
                                    ) : null}
                                    {!pendingIncomingCall && confirmedUpcomingCall && showSchedule ? (
                                        <StatusAlert
                                            tone="info"
                                            title={t(locale, 'profileCustomer', 'offer.callConfirmed')}
                                            action={
                                                <Button type="button" size="sm" asChild>
                                                    <Link
                                                        to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                                        params={{ bookingRequestId, bookingRequestOfferId }}
                                                        search={{ tab: 'call' }}
                                                        replace
                                                    >
                                                        {t(locale, 'profileCustomer', 'offer.viewCall')}
                                                    </Link>
                                                </Button>
                                            }
                                        >
                                            {t(locale, 'profileCustomer', 'offer.callOnTab')}
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
                                callTimePeers={[{ name: offer.cook.user.display, timeZone: offer.cookTimeZone }]}
                                viewerRole="customer"
                                onSend={async (message, fileUploadIds) => {
                                    const result = await sendOfferChatMessage({ bookingRequestOfferId, message, fileUploadIds });
                                    if (result.error || !result.data?.user.bookingRequestOfferChatMessageCreate.success) {
                                        toast.error(t(locale, 'profileCustomer', 'offer.messageSendFailed'));
                                        return false;
                                    }
                                    return true;
                                }}
                                onDeleteMessage={async (chatMessageId) => {
                                    const result = await deleteChatMessage({
                                        bookingRequestOfferEventId: chatMessageId,
                                    });
                                    if (result.error || !result.data?.user.bookingRequestOfferChatMessageDelete.success) {
                                        toast.error(t(locale, 'profileCustomer', 'offer.messageDeleteFailed'));
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
                                        toast.error(t(locale, 'profileCustomer', 'offer.reactionFailed'));
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
                                        toast.error(t(locale, 'profileCustomer', 'offer.proposalWithdrawFailed'));
                                        return;
                                    }
                                    toast.success(t(locale, 'profileCustomer', 'offer.proposalWithdrawn'));
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
                                callTimePeers={[{ name: offer.cook.user.display, timeZone: offer.cookTimeZone }]}
                                occasion={request.occasion}
                                bookingRequestId={bookingRequestId}
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
                                                  imageUrls: offer.customerTestimonial.imageUrls,
                                                  authorName: offer.customerTestimonial.authorName,
                                                  authorProfilePictureUrl: offer.customerTestimonial.authorProfilePicture?.url ?? null,
                                                  location: offer.customerTestimonial.location,
                                                  occasion: offer.customerTestimonial.occasion,
                                                  createdAt: offer.customerTestimonial.createdAt,
                                              }
                                            : null
                                    }
                                    missing={offer.testimonialMissing}
                                    authorFallback={{
                                        authorName: userDisplayName({
                                            firstName: user?.firstName ?? '',
                                            lastName: user?.lastName ?? '',
                                        }),
                                        authorProfilePictureUrl: user?.profilePicture?.url ?? null,
                                        location: request?.exactEventAddress?.city ?? null,
                                        occasion: request?.occasion ?? null,
                                    }}
                                    counterpart={{
                                        displayName: offer.cook.user.display,
                                        profilePictureUrl: offer.cook.user.profilePicture?.url ?? null,
                                    }}
                                    editing={testimonialEditing}
                                    onBusyChange={setTestimonialBusy}
                                    onSubmitted={() => setTestimonialSubmitted(true)}
                                    onEditingChange={setTestimonialEditing}
                                />
                            </TabsContent>
                        ) : null}
                    </Tabs>

                    <AlertDialog open={acceptOpen} onOpenChange={(open) => !acceptBusy && setAcceptOpen(open)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t(locale, 'profileCustomer', 'offer.acceptTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>{t(locale, 'profileCustomer', 'offer.acceptBody')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={acceptBusy}>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={acceptBusy}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        void onAcceptConfirm();
                                    }}
                                >
                                    {acceptBusy
                                        ? t(locale, 'profileCustomer', 'offer.accepting')
                                        : t(locale, 'profileCustomer', 'offer.continue')}
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
    const offerAddonsEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_ADDONS');
    const cook = offer.cook;
    const biographyText =
        cook.biographySummary.trim().length > 0 ? cook.biographySummary : cook.biography.trim().length > 0 ? cook.biography : null;
    const dualAccepted = offer.userAccepted === true && offer.cookAccepted === true;
    const canEditDiscount = offer.paymentStatus === 'EMPTY' && !dualAccepted;
    const selectedMenu = offer.suggestedMenus.find((menu) => menu.menuId === selectedMenuId) ?? null;
    const hasMenu = offer.configuredMenu != null || canConfigure || offer.suggestedMenus.length > 0;
    const pullIsPast = bookingPaymentPullIsPast(offer.plannedPaymentPullDateTime);
    const isSetupIntent = offer.payment?.type === 'SETUP_INTENT';
    const paymentFailed = offer.paymentStatus === 'FAILED';
    const timeZone = useTimeZone();
    const receiptsEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS');
    const [{ fetching: receiptBusy }, regenerateReceipt] = useMutation(ProfileCustomerBookingRequestOfferCustomerReceiptRegenerateDocument);
    const showPaymentReceipt = receiptsEnabled && bookingRequestOfferPaymentDocumentVisible(offer.paymentStatus);
    const negotiationOpen = offer.userAccepted !== false && offer.cookAccepted !== false && !dualAccepted;
    const showAddonPicker = offerAddonsEnabled && offer.addons.length > 0 && negotiationOpen && offer.paymentStatus === 'EMPTY';
    const showEventCalendar =
        !canPay &&
        dualAccepted &&
        request.status !== 'CANCELED' &&
        !request.canceledAt &&
        (offer.paymentStatus === 'SETUP' ||
            offer.paymentStatus === 'PAYED' ||
            offer.paymentStatus === 'TRANSFERRED' ||
            offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM');

    return (
        <div className={cn('grid gap-8', hasMenu && '@5xl:grid-cols-2 @5xl:items-start @5xl:gap-10')}>
            {showEventCalendar ? (
                <div className={cn(hasMenu && '@5xl:col-span-2')}>
                    <BookingEventCalendarLink
                        locale={locale}
                        whenLabel={
                            <BookingWhenLabel
                                {...formatBookingEventWhenFromCountry({
                                    instant: request.dateTime,
                                    locale,
                                    viewerTimeZone: timeZone,
                                    venueCountry: request.exactEventAddress.country,
                                    venueCity: request.exactEventAddress.city,
                                })}
                            />
                        }
                        timeZone={timeZoneFromCountry(request.exactEventAddress.country)}
                        venueCity={request.exactEventAddress.city}
                        occasion={request.occasion}
                        peerName={offer.cook.user.display}
                        guestCount={request.participants.length}
                        start={request.dateTime}
                        location={request.exactEventAddress.displayText}
                        bookingPath={localePath(locale, `/profile/booking-requests/${bookingRequestId}`)}
                        bookingRequestId={bookingRequestId}
                    />
                </div>
            ) : null}
            {showPaymentReceipt ? (
                <div className={cn(hasMenu && '@5xl:col-span-2')}>
                    <BookingRequestOfferPaymentDocumentPanel
                        locale={locale}
                        title={t(locale, 'profileCustomer', 'offer.receipt')}
                        description={t(locale, 'profileCustomer', 'offer.receiptHint')}
                        file={offer.customerReceiptFileUpload}
                        busy={receiptBusy}
                        onRegenerate={() => {
                            void regenerateReceipt({ bookingRequestOfferId }).then((result) => {
                                if (result.error || !result.data?.user.bookingRequestOfferCustomerReceiptRegenerate.success) {
                                    toast.error(t(locale, 'profileCustomer', 'offer.receiptFailed'));
                                }
                            });
                        }}
                    />
                </div>
            ) : null}
            {offer.configuredMenu ? (
                <section className="grid min-w-0 gap-3">
                    <h2 className="font-serif text-2xl/tight text-foreground">{t(locale, 'profileCustomer', 'offer.menu')}</h2>
                    <OfferMenuConfigured menu={offer.configuredMenu} />
                </section>
            ) : canConfigure || offer.suggestedMenus.length > 0 ? (
                <section className="grid min-w-0 gap-4">
                    <h2 className="font-serif text-2xl/tight text-foreground">{t(locale, 'profileCustomer', 'offer.menu')}</h2>
                    {offer.suggestedMenus.length > 1 ? (
                        <ul className="grid grid-cols-1 gap-3" aria-label={t(locale, 'profileCustomer', 'offer.suggestedMenus')}>
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
                    <p className="text-sm text-muted-foreground">{t(locale, 'profileCustomer', 'offer.sentBy')}</p>
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
                                        to="/{-$locale}/chefs/$pathName"
                                        params={{ pathName: cook.pathName }}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex text-muted-foreground hover:text-foreground"
                                        aria-label={t(locale, 'profileCustomer', 'checkout.openCookPage')}
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

                {showAddonPicker ? (
                    <BookingRequestOfferAddonSelectionList
                        bookingRequestOfferId={bookingRequestOfferId}
                        addons={offer.addons}
                        heading={t(locale, 'common', 'costBreakdown.extras')}
                        description={t(locale, 'profileCustomer', 'checkout.extrasHint')}
                    />
                ) : null}

                <section className="grid gap-4">
                    <h2 className="font-serif text-2xl/tight text-foreground">{t(locale, 'profileCustomer', 'offer.priceOverview')}</h2>
                    <OfferCostSummary offer={offer} locale={locale} />
                    <BookingRequestOfferParticipantAmendmentCustomerPanel
                        locale={locale}
                        canRequest={offer.canRequestParticipantAmendment}
                        preparationsCompletedAt={offer.preparationsCompletedAt}
                        amendment={offer.participantAmendment}
                        currentParticipants={request.participants}
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
                        tone={paymentFailed ? 'error' : 'warning'}
                        title={
                            paymentFailed
                                ? t(locale, 'profileCustomer', 'offer.paymentAttemptFailed')
                                : t(locale, 'profileCustomer', 'offer.paymentPending')
                        }
                        action={
                            <Button type="button" size="sm" asChild>
                                <Link
                                    to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/checkout"
                                    params={{ bookingRequestId, bookingRequestOfferId }}
                                >
                                    {isSetupIntent
                                        ? t(locale, 'profileCustomer', 'offer.providePayment')
                                        : t(locale, 'profileCustomer', 'offer.payNow')}
                                </Link>
                            </Button>
                        }
                    >
                        {paymentFailed
                            ? t(locale, 'profileCustomer', 'offer.paymentAttemptFailedBody')
                            : isSetupIntent
                              ? pullIsPast
                                  ? t(locale, 'profileCustomer', 'offer.setupChargeSoonBody')
                                  : t(locale, 'profileCustomer', 'offer.setupReserveBody')
                              : t(locale, 'profileCustomer', 'offer.completePaymentBody')}
                    </StatusAlert>
                ) : null}

                {paymentUnavailable ? (
                    <StatusAlert tone="error" title={t(locale, 'profileCustomer', 'checkout.unavailable')}>
                        {t(locale, 'profileCustomer', 'checkout.unavailableBody')}
                    </StatusAlert>
                ) : null}
            </div>
        </div>
    );
}
