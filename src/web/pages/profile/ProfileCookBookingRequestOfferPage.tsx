import { Link, notFound, useNavigate } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { ClipboardListIcon, FileTextIcon, MessageSquareIcon, MoreHorizontalIcon, StarIcon, VideoIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { bookingRequestOfferChatCanSend, bookingRequestPaidParticipants, formatCountryName, formatCurrency } from '../../../shared';
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
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { StatusAlert } from '../../components/base/status-alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/base/tabs';
import { Textarea } from '../../components/base/textarea';
import { BookingRequestOfferAttentionBanner } from '../../components/BookingRequestOfferAttentionBanner';
import { BookingRequestOfferCallTab } from '../../components/BookingRequestOfferCallTab';
import { BookingRequestOfferChat } from '../../components/BookingRequestOfferChat';
import {
    BookingRequestOfferParticipantAmendmentCookPanel,
    BookingRequestOfferParticipantAmendmentCookReview,
} from '../../components/BookingRequestOfferParticipantAmendmentPanel';
import { BookingRequestOfferCostOverviewPanel } from '../../components/BookingRequestOfferPriceConfigurationPanel';
import { bookingRequestOfferStatusClassName, bookingRequestOfferStatusLabel } from '../../components/bookingRequestOfferStatus';
import { BookingRequestOfferTestimonialPanel } from '../../components/BookingRequestOfferTestimonialPanel';
import { BookingStatusPill } from '../../components/BookingStatusPill';
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
    ProfileCookBookingRequestOfferChatMessageReactionUpsertDocument,
    ProfileCookBookingRequestOfferDeclineDocument,
    ProfileCookBookingRequestOfferPageUpdatesDocument,
    ProfileCookBookingRequestOfferParticipantAmendmentAcceptDocument,
    ProfileCookBookingRequestOfferParticipantAmendmentDeclineDocument,
    ProfileCookBookingRequestOfferPreparationsCompleteDocument,
    ProfileCookBookingRequestOfferUnreadNotificationCountResetDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import type { Locale } from '../../utils/locale';
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
    label: Record<Locale, string>;
    Icon: LucideIcon;
};

const OFFER_TAB_DEFS: readonly OfferTabDef[] = [
    { id: 'offer', label: { de: 'Angebot', en: 'Offer' }, Icon: FileTextIcon },
    { id: 'chat', label: { de: 'Chat', en: 'Chat' }, Icon: MessageSquareIcon },
    { id: 'request', label: { de: 'Anfrage', en: 'Request' }, Icon: ClipboardListIcon },
    { id: 'call', label: { de: 'Anruf', en: 'Call' }, Icon: VideoIcon },
    { id: 'testimonial', label: { de: 'Bewertung', en: 'Review' }, Icon: StarIcon },
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
    const declineReasonId = useId();

    const [, acceptOffer] = useMutation(ProfileCookBookingRequestOfferAcceptDocument);
    const [, declineOffer] = useMutation(ProfileCookBookingRequestOfferDeclineDocument);
    const [{ fetching: amendmentBusy }, acceptParticipantAmendment] = useMutation(
        ProfileCookBookingRequestOfferParticipantAmendmentAcceptDocument,
    );
    const [, declineParticipantAmendment] = useMutation(ProfileCookBookingRequestOfferParticipantAmendmentDeclineDocument);
    const [, completePreparations] = useMutation(ProfileCookBookingRequestOfferPreparationsCompleteDocument);
    const [, sendChatMessage] = useMutation(ProfileCookBookingRequestOfferChatMessageCreateDocument);
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

    async function onAccept() {
        if (busy) return;
        setBusy(true);
        try {
            const result = await acceptOffer({ bookingRequestOfferId });
            if (!result.data?.user.cook.bookingRequestOfferAccept.success) {
                throw new Error('accept failed');
            }
            toast.success({ de: 'Änderungen bestätigt.', en: 'Changes confirmed.' }[locale]);
        } catch {
            toast.error({ de: 'Bestätigung fehlgeschlagen.', en: 'Could not confirm.' }[locale]);
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
            toast.success({ de: 'Angebot zurückgezogen.', en: 'Offer withdrawn.' }[locale]);
        } catch {
            toast.error({ de: 'Zurückziehen fehlgeschlagen.', en: 'Could not withdraw the offer.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    async function onAcceptParticipantAmendment() {
        const result = await acceptParticipantAmendment({ bookingRequestOfferId });
        if (result.error || !result.data?.user.cook?.bookingRequestOfferParticipantAmendmentAccept.success) {
            toast.error(
                {
                    de: 'Die Teilnehmeränderung konnte nicht angenommen werden.',
                    en: 'Could not accept the participant change.',
                }[locale],
            );
            return;
        }
        toast.success(
            {
                de: 'Teilnehmeränderung angenommen.',
                en: 'Participant change accepted.',
            }[locale],
        );
    }

    async function onDeclineParticipantAmendment() {
        const result = await declineParticipantAmendment({ bookingRequestOfferId });
        if (result.error || !result.data?.user.cook?.bookingRequestOfferParticipantAmendmentDecline.success) {
            toast.error(
                {
                    de: 'Die Teilnehmeränderung konnte nicht abgelehnt werden.',
                    en: 'Could not decline the participant change.',
                }[locale],
            );
            return;
        }
        toast.success(
            {
                de: 'Teilnehmeränderung abgelehnt.',
                en: 'Participant change declined.',
            }[locale],
        );
    }

    return (
        <ProfilePinnedFooterLayout
            className="@container min-w-0"
            contentScroll={false}
            contentClassName="flex w-full min-w-0 flex-col pb-0"
            footer={
                pendingParticipantAmendment != null ? (
                    <>
                        <Button type="button" variant="outline" disabled={actionsBusy} onClick={() => void onDeclineParticipantAmendment()}>
                            {{ de: 'Ablehnen', en: 'Decline' }[locale]}
                        </Button>
                        <Button type="button" disabled={actionsBusy} onClick={() => void onAcceptParticipantAmendment()}>
                            {{ de: 'Änderung annehmen', en: 'Accept change' }[locale]}
                        </Button>
                    </>
                ) : canReAccept ? (
                    <Button type="button" disabled={busy} onClick={() => void onAccept()}>
                        {{ de: 'Änderungen bestätigen', en: 'Confirm changes' }[locale]}
                    </Button>
                ) : undefined
            }
        >
            <div className="grid shrink-0 gap-2 px-4">
                <div className="flex items-center justify-end gap-2">
                    <BookingStatusPill className={bookingRequestOfferStatusClassName(offer.status)}>
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
                                    aria-label={{ de: 'Weitere Aktionen', en: 'More actions' }[locale]}
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
                                    {{ de: 'Zurückziehen', en: 'Withdraw' }[locale]}
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
                    <StatusAlert tone="warning" title={{ de: 'Änderungen bestätigen', en: 'Confirm changes' }[locale]}>
                        {offer.isPriceAutoAdjusted
                            ? {
                                  de: 'Dein Gast hat etwas geändert und der Preis wurde automatisch angepasst (z. B. Fahrtkosten). Bestätige die Änderungen, damit die Buchung weitergehen kann. Du kannst den Preis vorher noch anpassen.',
                                  en: 'Your guest changed something and the price was adjusted automatically (for example travel costs). Confirm the changes so the booking can continue. You can still tweak the price first.',
                              }[locale]
                            : {
                                  de: 'Dein Gast hat eine Änderung gewünscht. Bestätige sie, damit die Buchung weitergehen kann.',
                                  en: 'Your guest requested a change. Confirm it so the booking can continue.',
                              }[locale]}
                    </StatusAlert>
                ) : null}
                {pendingIncomingCall ? (
                    <BookingRequestOfferAttentionBanner
                        message={
                            {
                                de: 'Terminanfrage vom Kunden: bitte bestätigen oder ablehnen',
                                en: 'Call request from the customer: please confirm or decline',
                            }[locale]
                        }
                        actionLabel={{ de: 'Zum Anruf', en: 'View call' }[locale]}
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
                    <TabsList variant="line" className="shrink-0" aria-label={{ de: 'Angebotsbereiche', en: 'Offer sections' }[locale]}>
                        {visibleTabDefs.map(({ id, label, Icon }) => (
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
                    {offer.activeCallRoom?.status === 'ACTIVE' || (!pendingIncomingCall && confirmedUpcomingCall) ? (
                        <div className="grid shrink-0 gap-3 px-4">
                            {offer.activeCallRoom?.status === 'ACTIVE' ? (
                                <StatusAlert
                                    tone="info"
                                    title={{ de: 'Anruf läuft', en: 'Call in progress' }[locale]}
                                    action={
                                        <Button type="button" size="sm" asChild>
                                            <Link
                                                to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                params={{ bookingRequestOfferId }}
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
                            {!pendingIncomingCall && confirmedUpcomingCall ? (
                                <StatusAlert
                                    tone="info"
                                    title={{ de: 'Gesprächstermin bestätigt', en: 'Discovery call confirmed' }[locale]}
                                    action={
                                        <Button type="button" size="sm" asChild>
                                            <Link
                                                to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                params={{ bookingRequestOfferId }}
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
                        canSend={bookingRequestOfferChatCanSend(offer.status)}
                        peers={[
                            {
                                display: offer.bookingRequest.user.display,
                                profilePictureUrl: offer.bookingRequest.user.profilePicture?.url,
                            },
                        ]}
                        viewerRole="cook"
                        onSend={async (message, fileUploadIds) => {
                            const result = await sendChatMessage({ bookingRequestOfferId, message, fileUploadIds });
                            if (result.error || !result.data?.user.cook.bookingRequestOfferChatMessageCreate.success) {
                                toast.error({ de: 'Nachricht konnte nicht gesendet werden.', en: 'Could not send the message.' }[locale]);
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
                        bookingRequestOfferId={bookingRequestOfferId}
                        locale={locale}
                        canNegotiate={canNegotiate}
                        busy={actionsBusy}
                        onAcceptParticipantAmendment={onAcceptParticipantAmendment}
                        onDeclineParticipantAmendment={onDeclineParticipantAmendment}
                        onPreparationsComplete={async () => {
                            const result = await completePreparations({ bookingRequestOfferId });
                            if (result.error || !result.data?.user.cook?.bookingRequestOfferPreparationsComplete.success) {
                                toast.error(
                                    {
                                        de: 'Einkauf konnte nicht markiert werden.',
                                        en: 'Could not mark shopping as done.',
                                    }[locale],
                                );
                                return;
                            }
                            toast.success(
                                {
                                    de: 'Einkauf als erledigt markiert.',
                                    en: 'Shopping marked as done.',
                                }[locale],
                            );
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
                        createDocument={ProfileCookBookingRequestOfferCallCreateDocument}
                        joinDocument={ProfileCookBookingRequestOfferCallJoinDocument}
                        leaveDocument={ProfileCookBookingRequestOfferCallLeaveDocument}
                        callSchedulingEnabled={cook.callSchedulingEnabled}
                        callDurationMinutes={cook.callDurationMinutes}
                        peerDisplayName={request.user.display}
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
                                      }
                                    : null
                            }
                            missing={offer.testimonialMissing}
                        />
                    </TabsContent>
                ) : null}
            </Tabs>

            <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Angebot zurückziehen?', en: 'Withdraw this offer?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {{ de: 'Bitte nenne kurz einen Grund.', en: 'Please briefly share a reason.' }[locale]}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                        id={declineReasonId}
                        value={declineReason}
                        onChange={(event) => setDeclineReason(event.target.value)}
                        placeholder={{ de: 'Grund…', en: 'Reason…' }[locale]}
                        rows={3}
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>{{ de: 'Abbrechen', en: 'Back' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={busy || declineReason.trim().length === 0}
                            onClick={(event) => {
                                event.preventDefault();
                                void onDecline();
                            }}
                        >
                            {{ de: 'Zurückziehen', en: 'Withdraw' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ProfilePinnedFooterLayout>
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
        ? { de: 'Menüvorschlag ändern', en: 'Suggest another menu' }[locale]
        : { de: 'Menü vorschlagen', en: 'Suggest a menu' }[locale];
    const canReAccept = offer.status === 'COOK_NEEDS_TO_ACCEPT';

    return (
        <div className="grid w-full min-w-0 gap-16">
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
                        ? { de: 'Gewähltes Menü', en: 'Configured menu' }[locale]
                        : { de: 'Vorgeschlagene Menüs', en: 'Suggested menus' }[locale]}
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
                                    }}
                                    showStatusBadge={false}
                                    to="/{-$locale}/profile/menus/$menuId"
                                    params={{ menuId: menu.menuId }}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Noch kein Menü vorgeschlagen.', en: 'No menu suggested yet.' }[locale]}
                    </p>
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

            <section className="grid gap-4">
                {canReAccept && offer.isPriceAutoAdjusted ? (
                    <StatusAlert tone="info">
                        {
                            {
                                de: 'Der Preis wurde automatisch angepasst (meist Fahrtkosten nach Adressänderung). Du kannst ihn noch ändern, bevor du oben bestätigst.',
                                en: 'The price was adjusted automatically (usually travel costs after an address change). You can still edit it before confirming above.',
                            }[locale]
                        }
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
                    <StatusAlert tone="info" title={{ de: 'Rechnung stellen', en: 'Issue your invoice' }[locale]}>
                        <p>
                            {
                                {
                                    de: 'Bitte stelle deine Rechnung über den Betrag ',
                                    en: 'Please issue your invoice for the amount ',
                                }[locale]
                            }
                            <span className="font-semibold">
                                {formatCurrency(offer.menuPriceCents + offer.travelExpensesCents, { locale })}
                            </span>
                            {
                                {
                                    de: ' aus. Dies entspricht deiner Leistung vor Abzug unserer Gebühr. Unsere peopleeat-Gebühr in Höhe von ',
                                    en: '. This corresponds to your service before deduction of our fee. Our peopleeat fee of ',
                                }[locale]
                            }
                            <span className="font-semibold">
                                {formatCurrency(offer.menuPriceCents + offer.travelExpensesCents - offer.payoutCentsCook, {
                                    locale,
                                })}
                            </span>
                            {
                                {
                                    de: ' wurde bereits bei der Auszahlung automatisch abgezogen. Du erhältst von uns per Email einen Beleg mit dem Auszahlungsbetrag zur Dokumentation.',
                                    en: ' was already automatically deducted at payout. You will receive a receipt with the payout amount from us by email for documentation.',
                                }[locale]
                            }
                        </p>
                    </StatusAlert>
                ) : null}
                {canNegotiate ? (
                    <Button type="button" variant="outline" className="justify-self-end" asChild disabled={busy}>
                        <Link
                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId/edit-price"
                            params={{ bookingRequestOfferId }}
                        >
                            {{ de: 'Preis anpassen', en: 'Adjust price' }[locale]}
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
            participants={request.participants}
            preferences={request.preferences}
            eventLocation={eventLocation}
            eventLocationHint={
                revealExactAddress
                    ? undefined
                    : {
                          de: 'Die genaue Adresse wird nach gemeinsamer Zusage freigegeben. Für die Reisekosten nutzen wir sie bereits.',
                          en: 'The exact address is shared after both sides accept. We already use it for travel expense calculations.',
                      }[locale]
            }
            estimatedTravelDistanceKm={offer.travelDistanceKm}
            estimatedTravelExpensesCents={offer.travelExpensesCents}
            invoiceAddress={revealExactAddress ? (request.invoiceAddress ?? null) : null}
        />
    );
}
