import { CalendarPlusIcon } from 'lucide-react';

import { formatDate, formatTime } from '../../shared';
import type {
    CookCallSlotBookingActor,
    CookCallSlotBookingAudience,
    CookCallSlotBookingStatus,
} from '../../shared/cookCallSlotBookingStatus';
import { cookCallSlotBookingStatusLabel, cookCallSlotBookingStatusTone } from '../../shared/cookCallSlotBookingStatus';
import { cn } from '../utils/cn';
import { callCalendarEventCopy, downloadCalendarEvent } from '../utils/downloadCalendarEvent';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from './base/card';
import { StatusBadge } from './base/status-badge';
import { Textarea } from './base/textarea';

/** Compact Card density for offer call schedule/call surfaces (rows + action panels). */
export const bookingOfferCallCardClassName = 'gap-4 py-4';
export const bookingOfferCallCardSectionClassName = 'px-4';

export type BookingRequestOfferCallBookingCardBooking = {
    cookCallSlotBookingId: string;
    startAt: string;
    endAt: string;
    status: CookCallSlotBookingStatus;
    initiator: CookCallSlotBookingActor;
    customerMessage?: string | null;
    cookMessage?: string | null;
    declineReason?: string | null;
    canceledReason?: string | null;
    videoCallRoomId?: string | null;
};

export type BookingRequestOfferCallBookingCardRole = 'user' | 'cook' | 'admin';

function callBookingAudience(role: BookingRequestOfferCallBookingCardRole): CookCallSlotBookingAudience {
    return role === 'user' ? 'customer' : role;
}

export type BookingRequestOfferCallBookingCardProps = {
    booking: BookingRequestOfferCallBookingCardBooking;
    role: BookingRequestOfferCallBookingCardRole;
    locale: Locale;
    timeZone: string;
    callDurationMinutes: number;
    peerDisplayName?: string;
    busy: boolean;
    decliningId: string | null;
    declineReason: string;
    cancelingId: string | null;
    cancelReason: string;
    readOnly: boolean;
    setDecliningId: (id: string | null) => void;
    setDeclineReason: (value: string) => void;
    setCancelingId: (id: string | null) => void;
    setCancelReason: (value: string) => void;
    onConfirm: (id: string) => Promise<void>;
    onDecline: (id: string) => Promise<void>;
    onCancel: (id: string) => Promise<void>;
};

function formatCallTime(value: string | Date, locale: Locale, timeZone: string): string {
    return formatTime(value, { locale, timeZone });
}

function describeReason(reason: string | null | undefined, locale: Locale): string | null {
    if (!reason) return null;
    if (reason === 'ANOTHER_SLOT_CONFIRMED') {
        return { de: 'Ein anderer Termin wurde bestätigt.', en: 'Another slot was confirmed.' }[locale];
    }
    return reason;
}

/** Presentational discovery-call booking card (confirm / decline / cancel UI, no GraphQL). */
export function BookingRequestOfferCallBookingCard({
    booking,
    role,
    locale,
    timeZone,
    callDurationMinutes,
    peerDisplayName,
    busy,
    decliningId,
    declineReason,
    cancelingId,
    cancelReason,
    readOnly,
    setDecliningId,
    setDeclineReason,
    setCancelingId,
    setCancelReason,
    onConfirm,
    onDecline,
    onCancel,
}: BookingRequestOfferCallBookingCardProps) {
    const start = new Date(booking.startAt);
    const end = new Date(booking.endAt);
    const isPending = booking.status === 'PENDING';
    const isConfirmed = booking.status === 'CONFIRMED';
    const fromCustomer = booking.initiator === 'CUSTOMER';
    const fromCook = booking.initiator === 'COOK';
    const isDeclining = decliningId === booking.cookCallSlotBookingId;
    const isCanceling = cancelingId === booking.cookCallSlotBookingId;
    const reasonText = describeReason(booking.declineReason ?? booking.canceledReason, locale);
    const audience = callBookingAudience(role);
    const canRespondAsUser = role === 'user' && isPending && fromCook;
    const canRespondAsCook = role === 'cook' && isPending && fromCustomer;
    const canDeclineAsAdmin = role === 'admin' && isPending;
    const canWithdrawAsUser = role === 'user' && isPending && fromCustomer;
    const canWithdrawAsCook = role === 'cook' && isPending && fromCook;
    const canCancelConfirmed = (role === 'user' || role === 'cook') && isConfirmed;
    const adminDeclineLabel = fromCook
        ? { de: 'Als Kunde ablehnen', en: 'Decline as customer' }[locale]
        : { de: 'Als Koch ablehnen', en: 'Decline as chef' }[locale];
    const whenLabel = `${formatDate(start, { locale, timeZone, weekday: true })} · ${formatCallTime(start, locale, timeZone)}–${formatCallTime(end, locale, timeZone)}${locale === 'de' ? ' Uhr' : ''}`;

    const hasBody =
        Boolean(booking.customerMessage) ||
        Boolean(booking.cookMessage) ||
        Boolean(reasonText) ||
        (!readOnly && (canRespondAsUser || canRespondAsCook || canDeclineAsAdmin)) ||
        isConfirmed ||
        (!readOnly && (canWithdrawAsUser || canWithdrawAsCook)) ||
        (!readOnly && isCanceling);

    return (
        <Card className={bookingOfferCallCardClassName}>
            <CardHeader className={bookingOfferCallCardSectionClassName}>
                <div className="grid gap-0.5">
                    {peerDisplayName ? <CardTitle className="font-medium">{peerDisplayName}</CardTitle> : null}
                    {peerDisplayName ? (
                        <p className="text-sm text-foreground">{whenLabel}</p>
                    ) : (
                        <CardTitle className="text-sm font-medium">{whenLabel}</CardTitle>
                    )}
                    <CardDescription className="text-xs">
                        {
                            {
                                de: `${callDurationMinutes}-Minuten-Gespräch`,
                                en: `${callDurationMinutes}-minute call`,
                            }[locale]
                        }
                    </CardDescription>
                </div>
                <CardAction>
                    <StatusBadge tone={cookCallSlotBookingStatusTone(booking, audience)}>
                        {cookCallSlotBookingStatusLabel(booking, audience, locale)}
                    </StatusBadge>
                </CardAction>
            </CardHeader>

            {hasBody ? (
                <CardContent className={cn('grid gap-3', bookingOfferCallCardSectionClassName)}>
                    {booking.customerMessage ? (
                        <div className="grid gap-1">
                            <span className="text-xs tracking-wide text-muted-foreground uppercase">
                                {{ de: 'Nachricht des Kunden', en: 'Customer message' }[locale]}
                            </span>
                            <p className="text-sm text-muted-foreground italic">{booking.customerMessage}</p>
                        </div>
                    ) : null}
                    {booking.cookMessage ? (
                        <div className="grid gap-1">
                            <span className="text-xs tracking-wide text-muted-foreground uppercase">
                                {{ de: 'Nachricht des Kochs', en: 'Chef message' }[locale]}
                            </span>
                            <p className="text-sm text-muted-foreground italic">{booking.cookMessage}</p>
                        </div>
                    ) : null}
                    {reasonText ? (
                        <div className="grid gap-1">
                            <span className="text-xs tracking-wide text-muted-foreground uppercase">
                                {{ de: 'Begründung', en: 'Reason' }[locale]}
                            </span>
                            <p className="text-sm text-muted-foreground italic">{reasonText}</p>
                        </div>
                    ) : null}

                    {!readOnly && (canRespondAsUser || canRespondAsCook) && !isDeclining ? (
                        <div className="flex flex-row-reverse flex-wrap justify-items-end gap-2">
                            <Button type="button" size="sm" disabled={busy} onClick={() => void onConfirm(booking.cookCallSlotBookingId)}>
                                {{ de: 'Bestätigen', en: 'Confirm' }[locale]}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => {
                                    setDecliningId(booking.cookCallSlotBookingId);
                                    setDeclineReason('');
                                }}
                            >
                                {{ de: 'Ablehnen', en: 'Decline' }[locale]}
                            </Button>
                        </div>
                    ) : null}

                    {!readOnly && canDeclineAsAdmin && !isDeclining ? (
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => {
                                    setDecliningId(booking.cookCallSlotBookingId);
                                    setDeclineReason('');
                                }}
                            >
                                {adminDeclineLabel}
                            </Button>
                        </div>
                    ) : null}

                    {!readOnly && isDeclining ? (
                        <div className="grid gap-2 rounded-md bg-secondary/40 p-3">
                            <Textarea
                                value={declineReason}
                                onChange={(event) => setDeclineReason(event.target.value)}
                                placeholder={{ de: 'Optionaler Grund', en: 'Optional reason' }[locale]}
                                rows={3}
                            />
                            <div className="flex flex-wrap justify-end gap-2">
                                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setDecliningId(null)}>
                                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={busy}
                                    onClick={() => void onDecline(booking.cookCallSlotBookingId)}
                                >
                                    {{ de: 'Absage senden', en: 'Send decline' }[locale]}
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {isConfirmed && !isCanceling ? (
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const copy = callCalendarEventCopy(locale);
                                    const peer = peerDisplayName?.trim() || { de: 'Gast', en: 'Guest' }[locale];
                                    downloadCalendarEvent({
                                        start,
                                        end,
                                        title: `${copy.titlePrefix} ${peer}`,
                                        description: copy.description,
                                        uid: `${booking.cookCallSlotBookingId}@peopleeat`,
                                    });
                                }}
                            >
                                <CalendarPlusIcon className="size-4" aria-hidden />
                                {callCalendarEventCopy(locale).addToCalendar}
                            </Button>
                            {!readOnly && canCancelConfirmed ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => {
                                        setCancelingId(booking.cookCallSlotBookingId);
                                        setCancelReason('');
                                    }}
                                >
                                    {{ de: 'Termin absagen', en: 'Cancel appointment' }[locale]}
                                </Button>
                            ) : null}
                        </div>
                    ) : null}

                    {!readOnly && (canWithdrawAsUser || canWithdrawAsCook) && !isCanceling ? (
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => {
                                    setCancelingId(booking.cookCallSlotBookingId);
                                    setCancelReason('');
                                }}
                            >
                                {{ de: 'Vorschlag zurückziehen', en: 'Withdraw suggestion' }[locale]}
                            </Button>
                        </div>
                    ) : null}

                    {!readOnly && isCanceling ? (
                        <div className="grid gap-2 rounded-md bg-secondary/40 p-3">
                            <p className="text-sm font-medium">
                                {
                                    {
                                        de: isConfirmed ? 'Termin wirklich absagen?' : 'Vorschlag wirklich zurückziehen?',
                                        en: isConfirmed ? 'Cancel this appointment?' : 'Withdraw this suggestion?',
                                    }[locale]
                                }
                            </p>
                            <Textarea
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                placeholder={{ de: 'Optionaler Grund', en: 'Optional reason' }[locale]}
                                rows={3}
                            />
                            <div className="flex flex-wrap justify-end gap-2">
                                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setCancelingId(null)}>
                                    {{ de: 'Zurück', en: 'Back' }[locale]}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={busy}
                                    onClick={() => void onCancel(booking.cookCallSlotBookingId)}
                                >
                                    {
                                        {
                                            de: isConfirmed ? 'Termin absagen' : 'Vorschlag zurückziehen',
                                            en: isConfirmed ? 'Cancel appointment' : 'Withdraw suggestion',
                                        }[locale]
                                    }
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            ) : null}
        </Card>
    );
}
