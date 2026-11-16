import { Link, notFound, useNavigate } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { ClipboardListIcon, FileTextIcon, MessageSquareIcon, MoreHorizontalIcon, StarIcon, VideoIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import {
    bookingRequestOfferChatCanSend,
    bookingRequestPaidParticipants,
    formatBookingEventWhenFromCountry,
    formatCountryName,
    formatCurrency,
    timeZoneFromCountry,
    userDisplayName,
} from '../../../shared';
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
import { Button } from '../../components/base/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { NotificationBadge } from '../../components/base/notification-badge';
import { StatusAlert } from '../../components/base/status-alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/base/tabs';
import { Textarea } from '../../components/base/textarea';
import { BookingEventCalendarLink } from '../../components/BookingEventCalendarLink';
import { BookingRequestOfferAttentionBanner } from '../../components/BookingRequestOfferAttentionBanner';
import { BookingRequestOfferCallControls } from '../../components/BookingRequestOfferCallPanel';
import { BookingRequestOfferCallSessionProvider } from '../../components/BookingRequestOfferCallSession';
import { BookingRequestOfferCallTab } from '../../components/BookingRequestOfferCallTab';
import { BookingRequestOfferChat } from '../../components/BookingRequestOfferChat';
import {
    BookingRequestOfferParticipantAmendmentCookPanel,
    BookingRequestOfferParticipantAmendmentCookReview,
} from '../../components/BookingRequestOfferParticipantAmendmentPanel';
import {
    BookingRequestOfferPaymentDocumentPanel,
    bookingRequestOfferPaymentDocumentVisible,
} from '../../components/BookingRequestOfferPaymentDocumentPanel';
import { BookingRequestOfferCostOverviewPanel } from '../../components/BookingRequestOfferPriceConfigurationPanel';
import {
    BOOKING_REQUEST_OFFER_TESTIMONIAL_EDIT_FORM_ID,
    BOOKING_REQUEST_OFFER_TESTIMONIAL_FORM_ID,
    BookingRequestOfferTestimonialPanel,
} from '../../components/BookingRequestOfferTestimonialPanel';
import { BookingStatusPill } from '../../components/BookingStatusPill';
import { BookingWhenLabel } from '../../components/BookingWhenLabel';
import { CookBookingRequestSummaryCard } from '../../components/CookBookingRequestSummaryCard';
import { CookMenuCard } from '../../components/CookMenuCard';
import { OfferMenuConfigured } from '../../components/OfferMenuConfigured';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type {
    GqlCProfileCookBookingRequestOfferPageQuery,
    GqlCProfileCookBookingRequestOfferPageUserFragment,
} from '../../graphql/generated';
import {
    ProfileCookBookingRequestOfferAcceptDocument,
    ProfileCookBookingRequestOfferCallCreateDocument,
    ProfileCookBookingRequestOfferCallJoinDocument,
    ProfileCookBookingRequestOfferCallLeaveDocument,
    ProfileCookBookingRequestOfferCallSlotCancelDocument,
    ProfileCookBookingRequestOfferCallSlotConfirmDocument,
    ProfileCookBookingRequestOfferCallSlotDeclineDocument,
    ProfileCookBookingRequestOfferCallSlotRequestDocument,
    ProfileCookBookingRequestOfferChatMessageCreateDocument,
    ProfileCookBookingRequestOfferChatMessageDeleteDocument,
    ProfileCookBookingRequestOfferChatMessageReactionUpsertDocument,
    ProfileCookBookingRequestOfferCookStatementRegenerateDocument,
    ProfileCookBookingRequestOfferDeclineDocument,
    ProfileCookBookingRequestOfferPageUpdatesDocument,
    ProfileCookBookingRequestOfferParticipantAmendmentAcceptDocument,
    ProfileCookBookingRequestOfferParticipantAmendmentDeclineDocument,
    ProfileCookBookingRequestOfferPreparationsCompleteDocument,
    ProfileCookBookingRequestOfferUnreadNotificationCountResetDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { localePath } from '../../utils/locale';
import type { Locale } from '../../utils/locale';
import { offerAddonPriceLabel } from '../../utils/offerAddonPriceLabel';
import { cookStubRouteBySlug } from './cookCatalog';

const offersListRoute = cookStubRouteBySlug('booking-request-offers');

export {
    profileCookBookingRequestOfferPageDescription,
    profileCookBookingRequestOfferPageTitle,
} from './profileCookBookingRequestOfferLabels';

const OFFER_TABS = ['offer', 'chat', 'request', 'call', 'testimonial'] as const;

export type ProfileCookBookingRequestOfferTab = (typeof OFFER_TABS)[number];

export type ProfileCookBookingRequestOfferSearch = {
    tab?: ProfileCookBookingRequestOfferTab;
};

function isOfferTab(value: unknown): value is ProfileCookBookingRequestOfferTab {
    return typeof value === 'string' && (OFFER_TABS as readonly string[]).includes(value);
}

export function parseProfileCookBookingRequestOfferSearch(search: Record<string, unknown>): ProfileCookBookingRequestOfferSearch {
    // Legacy `schedule` deep links resolve to the merged Call tab.
    const raw = search.tab === 'schedule' ? 'call' : search.tab;
    const tab = isOfferTab(raw) ? raw : undefined;
    return { tab };
}

function resolveOfferTab(
    tab: ProfileCookBookingRequestOfferTab | undefined,
    visible: ReadonlySet<ProfileCookBookingRequestOfferTab>,
    preferTestimonial: boolean,
): ProfileCookBookingRequestOfferTab {
    if (tab && isOfferTab(tab) && visible.has(tab)) return tab;
    if (preferTestimonial && visible.has('testimonial')) return 'testimonial';
    return 'offer';
}

type OfferTabDef = {
    id: ProfileCookBookingRequestOfferTab;
    Icon: LucideIcon;
};

const OFFER_TAB_DEFS: readonly OfferTabDef[] = [
    { id: 'offer', Icon: FileTextIcon },
    { id: 'chat', Icon: MessageSquareIcon },
    { id: 'request', Icon: ClipboardListIcon },
    { id: 'call', Icon: VideoIcon },
    { id: 'testimonial', Icon: StarIcon },
];

type CookOffer = NonNullable<NonNullable<NonNullable<GqlCProfileCookBookingRequestOfferPageUserFragment['cook']>['bookingRequestOffer']>>;

export function profileCookBookingRequestOfferPageVariables(bookingRequestOfferId: string) {
    return { bookingRequestOfferId };
}

export function ProfileCookBookingRequestOfferPage({
    data,
    search,
    bookingRequestOfferId,
}: {
    data: GqlCProfileCookBookingRequestOfferPageQuery;
    search: ProfileCookBookingRequestOfferSearch;
    bookingRequestOfferId: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId' });
    const seedUser = data.currentSession.user ?? null;
    const seedCook = seedUser?.cook ?? null;
    const seedOffer = seedCook?.bookingRequestOffer ?? null;
    if (!seedCook || !seedOffer) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCookBookingRequestOfferPageUpdatesDocument, { bookingRequestOfferId });
    const cook = user?.cook ?? null;
    const offer = cook?.bookingRequestOffer ?? null;

    const [declineOpen, setDeclineOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [testimonialBusy, setTestimonialBusy] = useState(false);
    const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);
    const [testimonialEditing, setTestimonialEditing] = useState(false);
    const declineReasonId = useId();

    const [, acceptOffer] = useMutation(ProfileCookBookingRequestOfferAcceptDocument);
    const [, declineOffer] = useMutation(ProfileCookBookingRequestOfferDeclineDocument);
    const [{ fetching: amendmentBusy }, acceptParticipantAmendment] = useMutation(
        ProfileCookBookingRequestOfferParticipantAmendmentAcceptDocument,
    );
    const [, declineParticipantAmendment] = useMutation(ProfileCookBookingRequestOfferParticipantAmendmentDeclineDocument);
    const [, completePreparations] = useMutation(ProfileCookBookingRequestOfferPreparationsCompleteDocument);
    const [, sendChatMessage] = useMutation(ProfileCookBookingRequestOfferChatMessageCreateDocument);
    const [, deleteChatMessage] = useMutation(ProfileCookBookingRequestOfferChatMessageDeleteDocument);
    const [, upsertOfferChatReaction] = useMutation(ProfileCookBookingRequestOfferChatMessageReactionUpsertDocument);
    const [, resetUnread] = useMutation(ProfileCookBookingRequestOfferUnreadNotificationCountResetDocument);

    useEffect(() => {
        if (user == null) return;
        if (offer == null) {
            void navigate({ to: offersListRoute.to });
        }
    }, [navigate, offer, user]);

    const request = offer?.bookingRequest ?? null;

    const visibleTabs = useMemo(() => {
        const ids = new Set<ProfileCookBookingRequestOfferTab>(['offer', 'chat', 'request', 'call']);
        if (offer == null) return ids;
        if (offer.status === 'COMPLETED' || offer.testimonialMissing || offer.cookTestimonial != null) {
            ids.add('testimonial');
        }
        return ids;
    }, [offer]);
    const tab = resolveOfferTab(search.tab, visibleTabs, offer?.testimonialMissing ?? false);
    const visibleTabDefs = OFFER_TAB_DEFS.filter((entry) => visibleTabs.has(entry.id));
    const testimonialTabMissing = offer?.testimonialMissing ?? false;

    const pendingIncomingCall = offer?.callBookings.find((booking) => booking.status === 'PENDING' && booking.initiator === 'CUSTOMER');
    const confirmedUpcomingCall = offer?.callBookings.find((booking) => booking.status === 'CONFIRMED');

    useEffect(() => {
        if (offer == null) return;
        if ((tab !== 'chat' && tab !== 'call') || offer.cookUnreadNotificationCount <= 0) return;
        void resetUnread({ bookingRequestOfferId });
    }, [tab, bookingRequestOfferId, offer, resetUnread]);

    if (cook == null || offer == null || request == null) {
        return null;
    }

    const canNegotiate = offer.status === 'USER_NEEDS_TO_ACCEPT' || offer.status === 'COOK_NEEDS_TO_ACCEPT';
    const canReAccept = offer.status === 'COOK_NEEDS_TO_ACCEPT';
    const pendingParticipantAmendment = offer.participantAmendment;
    const actionsBusy = busy || amendmentBusy;
    const showTestimonialComposeFooter =
        tab === 'testimonial' && offer.testimonialMissing && offer.cookTestimonial == null && !testimonialSubmitted && !testimonialEditing;
    const showTestimonialEditFooter = tab === 'testimonial' && testimonialEditing;

    async function onAccept() {
        if (busy) return;
        setBusy(true);
        try {
            const result = await acceptOffer({ bookingRequestOfferId });
            if (!result.data?.user.cook.bookingRequestOfferAccept.success) {
                throw new Error('accept failed');
            }
            toast.success(t(locale, 'profileCook', 'offer.changesConfirmed'));
        } catch {
            toast.error(t(locale, 'profileCook', 'offer.confirmFailed'));
        } finally {
            setBusy(false);
        }
    }

    async function onDecline() {
        const reason = declineReason.trim();
        if (reason.length === 0 || busy) return;
        setBusy(true);
        try {
            const result = await declineOffer({ bookingRequestOfferId, reason });
            if (!result.data?.user.cook.bookingRequestOfferDecline.success) {
                throw new Error('decline failed');
            }
            setDeclineOpen(false);
            toast.success(t(locale, 'profileCook', 'offer.withdrawn'));
        } catch {
            toast.error(t(locale, 'profileCook', 'offer.withdrawFailed'));
        } finally {
            setBusy(false);
        }
    }

    async function onAcceptParticipantAmendment() {
        const venue = offer?.participantAmendment?.exactEventAddress?.displayText.trim() ?? '';
        const result = await acceptParticipantAmendment({ bookingRequestOfferId });
        if (result.error || !result.data?.user.cook?.bookingRequestOfferParticipantAmendmentAccept.success) {
            toast.error(t(locale, 'profileCook', 'offer.participantAcceptFailed'));
            return;
        }
        toast.success(
            venue ? t(locale, 'profileCook', 'offer.addressChanged', { venue }) : t(locale, 'profileCook', 'offer.participantAccepted'),
        );
    }

    async function onDeclineParticipantAmendment() {
        const result = await declineParticipantAmendment({ bookingRequestOfferId });
        if (result.error || !result.data?.user.cook?.bookingRequestOfferParticipantAmendmentDecline.success) {
            toast.error(t(locale, 'profileCook', 'offer.participantDeclineFailed'));
            return;
        }
        toast.success(t(locale, 'profileCook', 'offer.participantDeclined'));
    }

    return (
        <BookingRequestOfferCallSessionProvider
            bookingRequestOfferId={bookingRequestOfferId}
            createDocument={ProfileCookBookingRequestOfferCallCreateDocument}
            joinDocument={ProfileCookBookingRequestOfferCallJoinDocument}
            leaveDocument={ProfileCookBookingRequestOfferCallLeaveDocument}
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
                                {t(locale, 'profileCook', 'offer.shareReview')}
                            </Button>
                        ) : pendingParticipantAmendment != null ? (
                            <>
                                {pendingParticipantAmendment.claimedAt == null ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={actionsBusy}
                                        onClick={() => void onDeclineParticipantAmendment()}
                                    >
                                        {t(locale, 'profileCook', 'actions.decline')}
                                    </Button>
                                ) : null}
                                <Button type="button" disabled={actionsBusy} onClick={() => void onAcceptParticipantAmendment()}>
                                    {pendingParticipantAmendment.claimedAt != null
                                        ? t(locale, 'profileCook', 'actions.retry')
                                        : t(locale, 'profileCook', 'actions.acceptChange')}
                                </Button>
                            </>
                        ) : canReAccept ? (
                            <Button type="button" disabled={busy} onClick={() => void onAccept()}>
                                {t(locale, 'profileCook', 'offer.confirmChanges')}
                            </Button>
                        ) : undefined
                    }
                >
                    <div className="grid shrink-0 gap-2 px-4">
                        <div className="flex items-center justify-end gap-2">
                            <BookingStatusPill hue={bookingRequestOfferStatusHue(offer.status)}>
                                {bookingRequestOfferStatusLabel(offer.status, locale, 'cook')}
                            </BookingStatusPill>
                            {canNegotiate ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            disabled={busy}
                                            aria-label={t(locale, 'profileCook', 'actions.moreActions')}
                                        >
                                            <MoreHorizontalIcon className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            variant="destructive"
                                            disabled={busy}
                                            onSelect={() => {
                                                setDeclineReason('');
                                                setDeclineOpen(true);
                                            }}
                                        >
                                            {t(locale, 'profileCook', 'offer.withdraw')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : null}
                        </div>
                        {pendingParticipantAmendment != null ? (
                            <BookingRequestOfferParticipantAmendmentCookReview
                                locale={locale}
                                amendment={pendingParticipantAmendment}
                                busy={actionsBusy}
                                onAccept={onAcceptParticipantAmendment}
                                onDecline={onDeclineParticipantAmendment}
                                showActions={false}
                            />
                        ) : null}
                        {canReAccept && pendingParticipantAmendment == null ? (
                            <StatusAlert tone="warning" title={t(locale, 'profileCook', 'offer.confirmChanges')}>
                                {offer.priceAutoAdjustReason === 'PARTICIPANTS'
                                    ? t(locale, 'profileCook', 'offer.confirmParticipants')
                                    : offer.priceAutoAdjustReason === 'PARTICIPANTS_AND_TRAVEL'
                                      ? t(locale, 'profileCook', 'offer.confirmParticipantsAndAddress')
                                      : offer.priceAutoAdjustReason === 'TRAVEL'
                                        ? t(locale, 'profileCook', 'offer.confirmAddress')
                                        : offer.priceAutoAdjustReason != null
                                          ? t(locale, 'profileCook', 'offer.confirmGenericPrice')
                                          : t(locale, 'profileCook', 'offer.confirmGeneric')}
                            </StatusAlert>
                        ) : null}
                        {pendingIncomingCall ? (
                            <BookingRequestOfferAttentionBanner
                                message={t(locale, 'profileCook', 'offer.callRequest')}
                                actionLabel={t(locale, 'profileCook', 'offer.viewCall')}
                                actionLink={
                                    tab !== 'call'
                                        ? {
                                              to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId',
                                              params: { bookingRequestOfferId },
                                              search: { tab: 'call' },
                                          }
                                        : undefined
                                }
                            />
                        ) : null}
                    </div>

                    <Tabs value={tab} className="flex min-h-0 flex-1 flex-col gap-0">
                        <div className="px-4">
                            <TabsList variant="line" className="shrink-0" aria-label={t(locale, 'profileCook', 'offer.sections')}>
                                {visibleTabDefs.map(({ id, Icon }) => (
                                    <TabsTrigger key={id} value={id} asChild>
                                        <Link
                                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                            params={{ bookingRequestOfferId }}
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
                                            {t(locale, 'profileCook', `offer.tabs.${id}`)}
                                            {id === 'testimonial' && testimonialTabMissing ? (
                                                <NotificationBadge
                                                    count={1}
                                                    placement="inline"
                                                    className="ml-1"
                                                    label={t(locale, 'profileCook', 'offer.reviewOutstanding')}
                                                />
                                            ) : null}
                                        </Link>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <TabsContent value="chat" className="mt-4 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
                            {offer.activeCallRoom?.status === 'ACTIVE' || (!pendingIncomingCall && confirmedUpcomingCall) ? (
                                <div className="grid shrink-0 gap-3 px-4">
                                    {offer.activeCallRoom?.status === 'ACTIVE' ? (
                                        <StatusAlert
                                            tone="info"
                                            title={t(locale, 'profileCook', 'offer.callInProgress')}
                                            action={
                                                <Button type="button" size="sm" asChild>
                                                    <Link
                                                        to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                        params={{ bookingRequestOfferId }}
                                                        search={{ tab: 'call' }}
                                                        replace
                                                    >
                                                        {t(locale, 'profileCook', 'offer.goToCall')}
                                                    </Link>
                                                </Button>
                                            }
                                        >
                                            {t(locale, 'profileCook', 'offer.videoCallActive')}
                                        </StatusAlert>
                                    ) : null}
                                    {!pendingIncomingCall && confirmedUpcomingCall ? (
                                        <StatusAlert
                                            tone="info"
                                            title={t(locale, 'profileCook', 'offer.callConfirmed')}
                                            action={
                                                <Button type="button" size="sm" asChild>
                                                    <Link
                                                        to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                        params={{ bookingRequestOfferId }}
                                                        search={{ tab: 'call' }}
                                                        replace
                                                    >
                                                        {t(locale, 'profileCook', 'offer.viewCall')}
                                                    </Link>
                                                </Button>
                                            }
                                        >
                                            {t(locale, 'profileCook', 'offer.callOnTab')}
                                        </StatusAlert>
                                    ) : null}
                                </div>
                            ) : null}
                            <BookingRequestOfferChat
                                messages={offer.messages}
                                canSend={bookingRequestOfferChatCanSend(offer.status)}
                                peers={[
                                    {
                                        display: offer.bookingRequest.user.display,
                                        profilePictureUrl: offer.bookingRequest.user.profilePicture?.url,
                                    },
                                ]}
                                callTimePeers={[
                                    { name: offer.bookingRequest.user.display, timeZone: offer.bookingRequest.customerTimeZone },
                                ]}
                                viewerRole="cook"
                                onSend={async (message, fileUploadIds) => {
                                    const result = await sendChatMessage({ bookingRequestOfferId, message, fileUploadIds });
                                    if (result.error || !result.data?.user.cook.bookingRequestOfferChatMessageCreate.success) {
                                        toast.error(t(locale, 'profileCook', 'offer.messageSendFailed'));
                                        return false;
                                    }
                                    return true;
                                }}
                                onDeleteMessage={async (chatMessageId) => {
                                    const result = await deleteChatMessage({
                                        bookingRequestOfferEventId: chatMessageId,
                                    });
                                    if (result.error || !result.data?.user.cook.bookingRequestOfferChatMessageDelete.success) {
                                        toast.error(t(locale, 'profileCook', 'offer.messageDeleteFailed'));
                                        return false;
                                    }
                                    return true;
                                }}
                                onReactMessage={async (chatMessageId, emoji) => {
                                    const result = await upsertOfferChatReaction({
                                        bookingRequestOfferEventId: chatMessageId,
                                        emoji,
                                    });
                                    if (result.error || !result.data?.user.cook.bookingRequestOfferChatMessageReactionUpsert.success) {
                                        toast.error(t(locale, 'profileCook', 'offer.reactionFailed'));
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
                                bookingRequestOfferId={bookingRequestOfferId}
                                locale={locale}
                                canNegotiate={canNegotiate}
                                busy={actionsBusy}
                                onAcceptParticipantAmendment={onAcceptParticipantAmendment}
                                onDeclineParticipantAmendment={onDeclineParticipantAmendment}
                                onPreparationsComplete={async () => {
                                    const result = await completePreparations({ bookingRequestOfferId });
                                    if (result.error || !result.data?.user.cook?.bookingRequestOfferPreparationsComplete.success) {
                                        toast.error(t(locale, 'profileCook', 'offer.shoppingFailed'));
                                        return;
                                    }
                                    toast.success(t(locale, 'profileCook', 'offer.shoppingDone'));
                                }}
                            />
                        </TabsContent>

                        <TabsContent
                            value="request"
                            className="mt-4 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                        >
                            <RequestTabPanel
                                offer={offer}
                                locale={locale}
                                timeZone={timeZone}
                                revealExactAddress={offer.userAccepted === true && offer.cookAccepted === true}
                            />
                        </TabsContent>

                        <TabsContent
                            value="call"
                            className="mt-4 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                        >
                            <BookingRequestOfferCallTab
                                role="cook"
                                bookingRequestOfferId={bookingRequestOfferId}
                                callBookings={offer.callBookings}
                                activeCallRoom={offer.activeCallRoom ?? null}
                                callSchedulingEnabled={cook.callSchedulingEnabled}
                                callDurationMinutes={cook.callDurationMinutes}
                                peerDisplayName={offer.bookingRequest.user.display}
                                callTimePeers={[
                                    { name: offer.bookingRequest.user.display, timeZone: offer.bookingRequest.customerTimeZone },
                                ]}
                                occasion={request.occasion}
                                bookingRequestId={request.bookingRequestId}
                                requestDocument={ProfileCookBookingRequestOfferCallSlotRequestDocument}
                                confirmDocument={ProfileCookBookingRequestOfferCallSlotConfirmDocument}
                                declineDocument={ProfileCookBookingRequestOfferCallSlotDeclineDocument}
                                cancelDocument={ProfileCookBookingRequestOfferCallSlotCancelDocument}
                            />
                        </TabsContent>

                        {visibleTabs.has('testimonial') ? (
                            <TabsContent
                                value="testimonial"
                                className="mt-4 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 data-[state=inactive]:hidden"
                            >
                                <BookingRequestOfferTestimonialPanel
                                    bookingRequestOfferId={bookingRequestOfferId}
                                    role="cook"
                                    existing={
                                        offer.cookTestimonial
                                            ? {
                                                  body: offer.cookTestimonial.body ?? '',
                                                  rating: offer.cookTestimonial.rating ?? null,
                                                  imageUrls: offer.cookTestimonial.imageUrls,
                                                  authorName: offer.cookTestimonial.authorName,
                                                  authorProfilePictureUrl: offer.cookTestimonial.authorProfilePicture?.url ?? null,
                                                  location: offer.cookTestimonial.location,
                                                  occasion: offer.cookTestimonial.occasion,
                                                  createdAt: offer.cookTestimonial.createdAt,
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
                                        location: request.exactEventAddress?.city ?? null,
                                        occasion: request.occasion ?? null,
                                    }}
                                    counterpart={{
                                        displayName: request.user.display,
                                        profilePictureUrl: request.user.profilePicture?.url ?? null,
                                    }}
                                    editing={testimonialEditing}
                                    onBusyChange={setTestimonialBusy}
                                    onSubmitted={() => setTestimonialSubmitted(true)}
                                    onEditingChange={setTestimonialEditing}
                                />
                            </TabsContent>
                        ) : null}
                    </Tabs>

                    <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t(locale, 'profileCook', 'offer.withdrawTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>{t(locale, 'profileCook', 'offer.withdrawBody')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <Textarea
                                id={declineReasonId}
                                value={declineReason}
                                onChange={(event) => setDeclineReason(event.target.value)}
                                placeholder={t(locale, 'profileCook', 'offer.reasonPlaceholder')}
                                rows={3}
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={busy}>{t(locale, 'profileCook', 'offer.withdrawBack')}</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={busy || declineReason.trim().length === 0}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        void onDecline();
                                    }}
                                >
                                    {t(locale, 'profileCook', 'offer.withdraw')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </ProfilePinnedFooterLayout>
            )}
        </BookingRequestOfferCallSessionProvider>
    );
}

function OfferTabPanel({
    offer,
    bookingRequestOfferId,
    locale,
    canNegotiate,
    busy,
    onAcceptParticipantAmendment,
    onDeclineParticipantAmendment,
    onPreparationsComplete,
}: {
    offer: CookOffer;
    bookingRequestOfferId: string;
    locale: Locale;
    canNegotiate: boolean;
    busy: boolean;
    onAcceptParticipantAmendment: () => Promise<void>;
    onDeclineParticipantAmendment: () => Promise<void>;
    onPreparationsComplete: () => Promise<void>;
}) {
    const adults = offer.bookingRequest.participants.filter((participant) => participant.type === 'ADULT').length;
    const discounted = offer.bookingRequest.participants.filter((participant) => participant.type === 'DISCOUNTED').length;
    const paid = bookingRequestPaidParticipants(adults, discounted);
    const pricePerPersonCents = paid > 0 ? Math.round(offer.menuPriceCents / paid) : 0;
    const hasSuggestedMenus = offer.suggestedMenus.length > 0;
    const menusEditLabel = hasSuggestedMenus
        ? t(locale, 'profileCook', 'offer.suggestAnotherMenu')
        : t(locale, 'profileCook', 'offer.suggestMenu');
    const canReAccept = offer.status === 'COOK_NEEDS_TO_ACCEPT';
    const timeZone = useTimeZone();
    const receiptsEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS');
    const [{ fetching: statementBusy }, regenerateStatement] = useMutation(ProfileCookBookingRequestOfferCookStatementRegenerateDocument);
    const showPayoutStatement = receiptsEnabled && bookingRequestOfferPaymentDocumentVisible(offer.paymentStatus);
    const request = offer.bookingRequest;
    const showEventCalendar = offer.userAccepted === true && offer.cookAccepted === true && request.status !== 'CANCELED';

    return (
        <div className="grid w-full min-w-0 gap-16">
            {showEventCalendar ? (
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
                    peerName={request.user.display}
                    guestCount={request.participants.length}
                    start={request.dateTime}
                    location={request.exactEventAddress.displayText}
                    bookingPath={localePath(locale, `/profile/booking-request-offers/${bookingRequestOfferId}?tab=offer`)}
                    bookingRequestId={request.bookingRequestId}
                />
            ) : null}
            <BookingRequestOfferParticipantAmendmentCookPanel
                locale={locale}
                amendment={offer.participantAmendment}
                canCompletePreparations={offer.canCompletePreparations}
                preparationsCompletedAt={offer.preparationsCompletedAt}
                busy={busy}
                onAccept={onAcceptParticipantAmendment}
                onDecline={onDeclineParticipantAmendment}
                onPreparationsComplete={onPreparationsComplete}
                amendmentActionsElsewhere
            />

            <section className="grid gap-4">
                <h2 className="font-semibold text-foreground">
                    {offer.configuredMenu
                        ? t(locale, 'profileCook', 'offer.configuredMenu')
                        : t(locale, 'profileCook', 'offer.suggestedMenus')}
                </h2>
                {offer.configuredMenu ? (
                    <OfferMenuConfigured menu={offer.configuredMenu} />
                ) : hasSuggestedMenus ? (
                    <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
                        {offer.suggestedMenus.map((menu) => (
                            <li key={menu.menuId} className="min-w-0">
                                <CookMenuCard
                                    menu={{
                                        title: menu.title,
                                        description: menu.description,
                                        courseCount: menu.courses.length,
                                        courseMealOptionImages: menu.courseMealOptionImages,
                                        generatedAt: menu.generatedAt,
                                    }}
                                    showStatusBadge={false}
                                    to="/{-$locale}/profile/menus/$menuId"
                                    params={{ menuId: menu.menuId }}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'offer.noMenuYet')}</p>
                )}
                {canNegotiate ? (
                    <Button type="button" variant="outline" className="justify-self-end" asChild disabled={busy}>
                        <Link
                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId/edit-menus"
                            params={{ bookingRequestOfferId }}
                        >
                            {menusEditLabel}
                        </Link>
                    </Button>
                ) : null}
            </section>

            {offer.addons.length > 0 ? (
                <section className="grid gap-4">
                    <h2 className="font-semibold text-foreground">{t(locale, 'profileCook', 'offerCreate.extras')}</h2>
                    <ul className="grid gap-3">
                        {offer.addons.map((addon) => (
                            <li key={addon.cookOfferAddonId} className="grid gap-1 rounded-xl border p-4">
                                <p className="font-medium text-foreground">{addon.title}</p>
                                {addon.description.trim().length > 0 ? (
                                    <p className="text-sm text-muted-foreground">{addon.description}</p>
                                ) : null}
                                <p className="text-sm text-muted-foreground">
                                    {offerAddonPriceLabel(addon.priceCents, addon.pricingUnit, locale)}
                                    {addon.inclusion === 'REQUIRED'
                                        ? ` (${t(locale, 'profileCook', 'offer.included')})`
                                        : addon.customerSelected
                                          ? ` (${t(locale, 'profileCook', 'offer.selected')})`
                                          : ` (${t(locale, 'profileCook', 'offer.notSelected')})`}
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <section className="grid gap-4">
                {canReAccept && offer.priceAutoAdjustReason != null ? (
                    <StatusAlert tone="info">
                        {t(
                            locale,
                            'profileCook',
                            offer.priceAutoAdjustReason === 'PARTICIPANTS'
                                ? 'offer.priceAdjustedGuests'
                                : offer.priceAutoAdjustReason === 'PARTICIPANTS_AND_TRAVEL'
                                  ? 'offer.priceAdjustedGuestsAndTravel'
                                  : offer.priceAutoAdjustReason === 'TRAVEL'
                                    ? 'offer.travelAdjusted'
                                    : 'offer.priceAdjusted',
                        )}
                    </StatusAlert>
                ) : null}
                <BookingRequestOfferCostOverviewPanel
                    locale={locale}
                    viewer="cook"
                    participantsAdult={adults}
                    participantsDiscounted={discounted}
                    pricePerPersonCents={pricePerPersonCents}
                    travelExpensesCents={offer.travelExpensesCents}
                    menuPriceCents={offer.menuPriceCents}
                />
                {offer.status === 'COMPLETED' && offer.menuPriceCents + offer.travelExpensesCents > 0 ? (
                    <StatusAlert tone="info" title={t(locale, 'profileCook', 'offer.invoiceTitle')}>
                        <p>
                            {t(locale, 'profileCook', 'offer.invoiceBefore')}
                            <span className="font-semibold">
                                {formatCurrency(offer.menuPriceCents + offer.travelExpensesCents, { locale })}
                            </span>
                            {t(locale, 'profileCook', 'offer.invoiceMiddle')}
                            <span className="font-semibold">
                                {formatCurrency(offer.menuPriceCents + offer.travelExpensesCents - offer.payoutCentsCook, {
                                    locale,
                                })}
                            </span>
                            {t(locale, 'profileCook', 'offer.invoiceAfter')}
                        </p>
                        {receiptsEnabled ? <p>{t(locale, 'profileCook', 'offer.statementHint')}</p> : null}
                    </StatusAlert>
                ) : null}
                {showPayoutStatement ? (
                    <BookingRequestOfferPaymentDocumentPanel
                        locale={locale}
                        title={t(locale, 'profileCook', 'offer.statement')}
                        description={t(locale, 'profileCook', 'offer.statementBody')}
                        file={offer.cookStatementFileUpload}
                        busy={statementBusy}
                        onRegenerate={() => {
                            void regenerateStatement({ bookingRequestOfferId }).then((result) => {
                                if (result.error || !result.data?.user.cook.bookingRequestOfferCookStatementRegenerate.success) {
                                    toast.error(t(locale, 'profileCook', 'offer.statementFailed'));
                                }
                            });
                        }}
                    />
                ) : null}
                {canNegotiate ? (
                    <Button type="button" variant="outline" className="justify-self-end" asChild disabled={busy}>
                        <Link
                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId/edit-price"
                            params={{ bookingRequestOfferId }}
                        >
                            {t(locale, 'profileCook', 'offer.adjustPrice')}
                        </Link>
                    </Button>
                ) : null}
            </section>
        </div>
    );
}

function RequestTabPanel({
    offer,
    locale,
    timeZone,
    revealExactAddress,
}: {
    offer: CookOffer;
    locale: Locale;
    timeZone: string;
    revealExactAddress: boolean;
}) {
    const request = offer.bookingRequest;
    const approximateCityLine = [request.exactEventAddress.postCode, request.exactEventAddress.city]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ');
    const approximateLocation = [approximateCityLine, formatCountryName(request.exactEventAddress.country, { locale })]
        .filter(Boolean)
        .join(', ');
    const eventLocation = revealExactAddress
        ? request.exactEventAddress.displayText.trim().length > 0
            ? request.exactEventAddress.displayText
            : approximateLocation
        : approximateLocation.length > 0
          ? approximateLocation
          : request.exactEventAddress.city.trim().length > 0
            ? request.exactEventAddress.city
            : request.exactEventAddress.displayText;

    return (
        <CookBookingRequestSummaryCard
            locale={locale}
            timeZone={timeZone}
            occasion={request.occasion}
            dateTime={request.dateTime}
            venueCountry={request.exactEventAddress.country}
            venueCity={request.exactEventAddress.city}
            participants={request.participants}
            preferences={request.preferences}
            eventLocation={eventLocation}
            eventLocationHint={revealExactAddress ? undefined : t(locale, 'profileCook', 'offer.exactAddressHint')}
            estimatedTravelDistanceKm={offer.travelDistanceKm}
            estimatedTravelExpensesCents={offer.travelExpensesCents}
            setting={request.setting}
            kitchenDetails={request.kitchenDetails}
            invoiceAddress={revealExactAddress ? (request.invoiceAddress ?? null) : null}
            dateTimeAction={
                revealExactAddress && request.status !== 'CANCELED'
                    ? (whenLabel) => (
                          <BookingEventCalendarLink
                              locale={locale}
                              whenLabel={whenLabel}
                              timeZone={timeZoneFromCountry(request.exactEventAddress.country)}
                              venueCity={request.exactEventAddress.city}
                              occasion={request.occasion}
                              peerName={request.user.display}
                              guestCount={request.participants.length}
                              start={request.dateTime}
                              location={eventLocation}
                              bookingPath={localePath(locale, `/profile/booking-request-offers/${offer.bookingRequestOfferId}?tab=offer`)}
                              bookingRequestId={request.bookingRequestId}
                          />
                      )
                    : undefined
            }
        />
    );
}
