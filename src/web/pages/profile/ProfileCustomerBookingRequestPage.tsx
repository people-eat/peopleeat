import { Link, notFound } from '@tanstack/react-router';
import { CircleHelpIcon, HeadsetIcon, MoreHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { bookingRequestPriceClassLabel, formatCurrency, formatDateTime, formatParticipants } from '../../../shared';
import { bookingRequestStatusHue, bookingRequestStatusLabel } from '../../../shared/bookingRequestStatus';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/base/popover';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import { BookingRequestDiscountEditor } from '../../components/BookingRequestDiscountEditor';
import { BookingStatusPill } from '../../components/BookingStatusPill';
import { CustomerBookingRequestOfferCard } from '../../components/CustomerBookingRequestOfferCard';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import { UserBookingRequestChurnDialog } from '../../components/UserBookingRequestChurnDialog';
import type { GqlCProfileCustomerBookingRequestPageQuery } from '../../graphql/generated';
import {
    ProfileBookingRequestCancelDocument,
    ProfileBookingRequestDiscountUpdateDocument,
    ProfileCustomerBookingRequestPageUpdatesDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cn } from '../../utils/cn';

export const profileCustomerBookingRequestPageTitle = {
    de: 'Buchungsanfrage',
    en: 'Booking request',
} as const;
export const profileCustomerBookingRequestPageDescription = {
    de: 'Details zu deiner Buchungsanfrage.',
    en: 'Details for your booking request.',
} as const;

const CANCELABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW', 'EXPIRED']);
const UPDATABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW']);

function initialsFromDisplay(display: string): string {
    const parts = display.trim().split(/\s+/u).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function DetailField({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
    return (
        <div className={cn('grid gap-1 self-start', className)}>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="text-sm wrap-break-word text-foreground">
                {value}
                {hint != null ? <div className="mt-1 text-sm text-muted-foreground">{hint}</div> : null}
            </dd>
        </div>
    );
}

export function profileCustomerBookingRequestPageVariables(bookingRequestId: string) {
    return { bookingRequestId };
}

export function ProfileCustomerBookingRequestPage({
    data,
    bookingRequestId,
}: {
    data: GqlCProfileCustomerBookingRequestPageQuery;
    bookingRequestId: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const seedUser = data.currentSession.user ?? null;
    const seedRequest = seedUser?.bookingRequest ?? null;
    if (!seedRequest) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCustomerBookingRequestPageUpdatesDocument, { bookingRequestId });
    const request = user?.bookingRequest ?? null;

    const [churnOpen, setChurnOpen] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelBusy, setCancelBusy] = useState(false);
    const [cancelError, setCancelError] = useState(false);

    const [, cancelRequest] = useMutation(ProfileBookingRequestCancelDocument);
    const [, updateDiscount] = useMutation(ProfileBookingRequestDiscountUpdateDocument);
    const offerAmendmentEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_AMENDMENT');

    if (request == null || user == null) {
        return null;
    }

    const canCancel = CANCELABLE_STATUSES.has(request.status) && !request.canceledAt;
    const canUpdate = UPDATABLE_STATUSES.has(request.status) && !request.canceledAt;
    const amendableOffer = request.offers.find((offer) => offer.canRequestParticipantAmendment) ?? null;
    const pendingAmendmentOffer = request.offers.find((offer) => offer.participantAmendment != null) ?? null;
    const canAmendParticipants = offerAmendmentEnabled && amendableOffer != null;
    const canEdit = canUpdate || canAmendParticipants;
    const canEditDiscount = canUpdate;
    const offers = request.offers;
    const supportRequest = request.supportRequest ?? null;
    const showFooter = canEdit || canCancel;
    const pendingAmendment = pendingAmendmentOffer?.participantAmendment ?? null;
    const statusForPill = request.canceledAt ? 'CANCELED' : request.status;
    const displayName = user.firstName.trim().length > 0 ? user.firstName : '?';
    const priceClassLabel = request.priceClassType != null ? bookingRequestPriceClassLabel(request.priceClassType, locale) : null;
    const exactAddress = request.exactEventAddress.displayText;
    const cookVisibleAddress =
        request.exactEventAddress.city.trim().length > 0 ? request.exactEventAddress.city : request.exactEventAddress.displayText;
    const hasOriginalMessage = request.originalMessage.trim().length > 0;
    const supportUnread = supportRequest?.userUnreadNotificationCount ?? 0;

    async function confirmCancel() {
        const reason = cancelReason.trim();
        if (reason.length === 0 || cancelBusy) return;
        setCancelBusy(true);
        setCancelError(false);
        try {
            const result = await cancelRequest({ bookingRequestId, reason });
            if (!result.data?.user.bookingRequestCancel.success) {
                setCancelError(true);
                return;
            }
            setCancelConfirmOpen(false);
            setChurnOpen(false);
            toast.success({ de: 'Anfrage storniert.', en: 'Request cancelled.' }[locale]);
        } catch {
            setCancelError(true);
        } finally {
            setCancelBusy(false);
        }
    }

    return (
        <>
            <ProfilePinnedFooterLayout
                className="@container min-w-0"
                contentClassName="grid w-full min-w-0 content-start gap-6"
                footer={
                    showFooter ? (
                        <>
                            {canCancel ? (
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
                                        <DropdownMenuItem variant="destructive" onSelect={() => setChurnOpen(true)}>
                                            {{ de: 'Anfrage stornieren', en: 'Cancel request' }[locale]}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : null}
                            {canEdit ? (
                                <Button type="button" asChild>
                                    <Link to="/{-$locale}/profile/booking-requests/$bookingRequestId/edit" params={{ bookingRequestId }}>
                                        {canUpdate
                                            ? { de: 'Bearbeiten', en: 'Edit' }[locale]
                                            : { de: 'Buchung ändern', en: 'Change booking' }[locale]}
                                    </Link>
                                </Button>
                            ) : null}
                        </>
                    ) : undefined
                }
            >
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                        {supportRequest != null ? (
                            <Link
                                to="/{-$locale}/profile/support-requests/$supportRequestId"
                                params={{ supportRequestId: supportRequest.supportRequestId }}
                            >
                                <HeadsetIcon className="size-4" />
                                {{ de: 'Support öffnen', en: 'Open support' }[locale]}
                                {supportUnread > 0 ? (
                                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-medium">
                                        {supportUnread}
                                    </Badge>
                                ) : null}
                            </Link>
                        ) : (
                            <Link to="/{-$locale}/profile/support-requests/create" search={{ bookingRequestId }}>
                                <HeadsetIcon className="size-4" />
                                {{ de: 'Support', en: 'Support' }[locale]}
                            </Link>
                        )}
                    </Button>
                    <BookingStatusPill hue={bookingRequestStatusHue(statusForPill)} className="w-fit">
                        {bookingRequestStatusLabel(statusForPill, locale, 'customer')}
                    </BookingStatusPill>
                </div>

                {pendingAmendment != null ? (
                    <StatusAlert
                        tone="info"
                        title={
                            {
                                de: pendingAmendment.claimedAt != null ? 'Änderung wird angewendet' : 'Änderung vorgeschlagen',
                                en: pendingAmendment.claimedAt != null ? 'Change is being applied' : 'Change proposed',
                            }[locale]
                        }
                    >
                        {pendingAmendment.claimedAt != null
                            ? {
                                  de: `Dein Koch hat den Vorschlag angenommen. Preis und Zahlung werden gerade aktualisiert. Neuer Gastgeberpreis: ${formatCurrency(pendingAmendment.totalCentsCustomerAfter, { locale })}.`,
                                  en: `Your chef accepted the proposal. Price and payment are updating now. New host price: ${formatCurrency(pendingAmendment.totalCentsCustomerAfter, { locale })}.`,
                              }[locale]
                            : {
                                  de: `Dein Vorschlag wartet auf die Bestätigung des Kochs. Neuer Gastgeberpreis: ${formatCurrency(pendingAmendment.totalCentsCustomerAfter, { locale })}.`,
                                  en: `Your proposal is waiting for the chef to confirm. New host price: ${formatCurrency(pendingAmendment.totalCentsCustomerAfter, { locale })}.`,
                              }[locale]}
                    </StatusAlert>
                ) : null}

                <section className="grid gap-4">
                    <h2 className="font-serif text-2xl/tight text-foreground">{{ de: 'Angebote', en: 'Offers' }[locale]}</h2>
                    {request.status === 'OFFERS_WAITING_FOR_REVIEW' && offers.length > 0 ? (
                        <StatusAlert
                            tone="info"
                            title={
                                {
                                    de: 'Prüfe deine Angebote und teile den Köchen deine Entscheidung mit.',
                                    en: 'Review your offers and let the chefs know your decision.',
                                }[locale]
                            }
                        >
                            {
                                {
                                    de:
                                        offers.length === 1
                                            ? 'Du hast 1 Angebot erhalten. Du kannst Menüs vergleichen, mit den Köchen chatten oder sie anrufen, bevor du dich entscheidest.'
                                            : `Du hast ${offers.length} Angebote erhalten. Du kannst Menüs vergleichen, mit den Köchen chatten oder sie anrufen, bevor du dich entscheidest.`,
                                    en:
                                        offers.length === 1
                                            ? "You've received 1 offer. You can compare menus, chat with the chefs or call them before you decide."
                                            : `You've received ${offers.length} offers. You can compare menus, chat with the chefs or call them before you decide.`,
                                }[locale]
                            }
                        </StatusAlert>
                    ) : null}
                    {offers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{{ de: 'Noch keine Angebote.', en: 'No offers yet.' }[locale]}</p>
                    ) : (
                        <ul className="grid grid-cols-1 gap-4 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4">
                            {offers.map((offer) => (
                                <li key={offer.bookingRequestOfferId} className="min-w-0">
                                    <CustomerBookingRequestOfferCard bookingRequestId={bookingRequestId} offer={offer} />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <div
                    className={cn(
                        'grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm',
                        hasOriginalMessage && '@xl:grid-cols-3 @xl:items-start',
                    )}
                >
                    <dl className={cn('grid gap-4 @md:grid-cols-2', hasOriginalMessage && '@xl:col-span-2')}>
                        <DetailField label={{ de: 'Anlass', en: 'Occasion' }[locale]} value={request.occasion} />
                        <DetailField
                            label={{ de: 'Teilnehmer', en: 'Participants' }[locale]}
                            value={formatParticipants(request.participants, { locale })}
                        />
                        {request.participants.some((participant) => participant.restrictions.length > 0) ? (
                            <DetailField
                                label={{ de: 'Einschränkungen', en: 'Restrictions' }[locale]}
                                value={
                                    <ul className="grid gap-1">
                                        {request.participants
                                            .filter((participant) => participant.restrictions.length > 0)
                                            .map((participant) => (
                                                <li key={participant.bookingRequestParticipantId}>
                                                    <span className="font-medium">{participant.name}:</span>{' '}
                                                    {participant.restrictions.join(', ')}
                                                </li>
                                            ))}
                                    </ul>
                                }
                            />
                        ) : null}
                        <DetailField
                            label={{ de: 'Datum & Uhrzeit', en: 'Date & time' }[locale]}
                            value={formatDateTime(request.dateTime, { locale, timeZone, dateStyle: 'full' })}
                        />
                        <DetailField
                            label={{ de: 'Präferenzen', en: 'Preferences' }[locale]}
                            value={
                                request.preferences.length > 0
                                    ? request.preferences.join(', ')
                                    : { de: 'Keine Präferenzen', en: 'No preferences' }[locale]
                            }
                        />
                        {priceClassLabel != null ? (
                            <DetailField label={{ de: 'Preisklasse', en: 'Price class' }[locale]} value={priceClassLabel} />
                        ) : null}
                        <DetailField
                            label={{ de: 'Veranstaltungsort', en: 'Event location' }[locale]}
                            value={exactAddress}
                            hint={
                                <p className="flex items-center gap-1">
                                    <span>
                                        {
                                            {
                                                de: `Köche sehen nur: ${cookVisibleAddress}`,
                                                en: `Cooks only see: ${cookVisibleAddress}`,
                                            }[locale]
                                        }
                                    </span>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-xs"
                                                className="text-muted-foreground"
                                                aria-label={
                                                    {
                                                        de: 'Mehr zur Adresssichtbarkeit',
                                                        en: 'More about address visibility',
                                                    }[locale]
                                                }
                                            >
                                                <CircleHelpIcon />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-72 text-sm text-muted-foreground">
                                            {
                                                {
                                                    de: 'Köche sehen vor einer gemeinsamen Zusage nur die Stadt. Die vollständige Adresse nutzen wir im Hintergrund für die genaue Reisekostenberechnung und geben sie erst danach frei.',
                                                    en: 'Cooks only see the city until both sides accept. We still use your full address in the background for exact travel expense calculations, and share it only after that.',
                                                }[locale]
                                            }
                                        </PopoverContent>
                                    </Popover>
                                </p>
                            }
                        />
                        {request.canceledAt && request.cancellationReason ? (
                            <DetailField
                                className="@md:col-span-2"
                                label={{ de: 'Grund', en: 'Reason' }[locale]}
                                value={request.cancellationReason}
                            />
                        ) : null}
                    </dl>

                    {hasOriginalMessage ? (
                        <div className="grid min-w-0 w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2 self-start">
                            <article className="w-max max-w-full justify-self-end rounded-2xl rounded-br-sm bg-muted px-4 py-2 text-sm/relaxed whitespace-pre-wrap wrap-break-word text-foreground shadow-sm">
                                <p className="mb-0.5 truncate text-[11px] leading-tight font-semibold text-primary">{displayName}</p>
                                {request.originalMessage}
                            </article>
                            <Avatar size="sm" className="shrink-0">
                                {user.profilePicture != null ? <AvatarImage src={user.profilePicture.url} alt="" /> : null}
                                <AvatarFallback className="bg-foreground/10 text-[10px] font-semibold text-foreground/75">
                                    {initialsFromDisplay(displayName)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    ) : null}
                </div>

                {canEditDiscount || request.promoCode != null || request.giftCard != null ? (
                    <section className="grid max-w-xl gap-4">
                        <h2 className="font-serif text-2xl/tight text-foreground">{{ de: 'Rabatt', en: 'Discount' }[locale]}</h2>
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
                    </section>
                ) : null}
            </ProfilePinnedFooterLayout>

            <UserBookingRequestChurnDialog
                bookingRequestId={bookingRequestId}
                open={churnOpen}
                onClose={() => setChurnOpen(false)}
                onProceedWithCancellation={() => {
                    setChurnOpen(false);
                    setCancelReason('');
                    setCancelError(false);
                    setCancelConfirmOpen(true);
                }}
                onDiscountApplied={() => {
                    toast.success(
                        {
                            de: 'Dein Rabatt von 50 € wurde erfolgreich auf diese Buchung angewendet.',
                            en: 'Your 50 € discount has been successfully applied to this booking.',
                        }[locale],
                    );
                }}
                onRecallRequested={() => {
                    toast.success(
                        {
                            de: 'Wir haben deine Anfrage erhalten und rufen dich so schnell wie möglich zurück.',
                            en: 'We have received your request and will call you back as soon as possible.',
                        }[locale],
                    );
                }}
            />

            <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {{ de: 'Anfrage wirklich stornieren?', en: 'Really cancel this request?' }[locale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Bitte gib kurz an, warum du die Anfrage stornierst.',
                                    en: 'Please briefly tell us why you are cancelling.',
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                        placeholder={{ de: 'Grund…', en: 'Reason…' }[locale]}
                        rows={3}
                    />
                    {cancelError ? (
                        <p className="text-sm text-destructive" role="alert">
                            {{ de: 'Stornierung fehlgeschlagen.', en: 'Cancellation failed.' }[locale]}
                        </p>
                    ) : null}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={cancelBusy}>{{ de: 'Abbrechen', en: 'Back' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={cancelBusy || cancelReason.trim().length === 0}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmCancel();
                            }}
                        >
                            {{ de: 'Endgültig stornieren', en: 'Cancel permanently' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
