import { Link } from '@tanstack/react-router';
import type { DocumentInput } from '@urql/core';
import { CalendarPlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { formatDate, formatTime } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import { callCalendarEventCopy, downloadCalendarEvent } from '../utils/downloadCalendarEvent';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './base/card';
import { DateTimePicker } from './base/date-time-picker';
import type { StatusTone } from './base/status';
import { StatusAlert } from './base/status-alert';
import { StatusBadge } from './base/status-badge';
import { Textarea } from './base/textarea';

/** Compact Card density for offer call schedule/call surfaces (rows + action panels). */
export const bookingOfferCallCardClassName = 'gap-4 py-4';
export const bookingOfferCallCardSectionClassName = 'px-4';

export type BookingRequestOfferScheduleCallBooking = {
    cookCallSlotBookingId: string;
    startAt: string;
    endAt: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'DECLINED';
    initiator: 'CUSTOMER' | 'COOK';
    customerMessage?: string | null;
    cookMessage?: string | null;
    declineReason?: string | null;
    canceledReason?: string | null;
    videoCallRoomId?: string | null;
};

type BookingRequestOfferScheduleRole = 'user' | 'cook' | 'admin';

export type BookingRequestOfferScheduleCallSlot = {
    startAt: string;
    endAt: string;
};

export type BookingRequestOfferScheduleTabProps = {
    role: BookingRequestOfferScheduleRole;
    bookingRequestOfferId: string;
    callBookings: readonly BookingRequestOfferScheduleCallBooking[];
    callSchedulingEnabled: boolean;
    callDurationMinutes: number;
    /** Customer slot picker — free slots from the cook. */
    callSlots?: readonly BookingRequestOfferScheduleCallSlot[];
    peerDisplayName?: string;
    requestDocument?: DocumentInput;
    confirmDocument?: DocumentInput;
    declineDocument?: DocumentInput;
    cancelDocument?: DocumentInput;
};

const MS_PER_MINUTE = 60_000;

function mutationSucceeded(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const walk = (value: unknown): boolean | null => {
        if (!value || typeof value !== 'object') return null;
        if ('success' in value && typeof value.success === 'boolean') {
            return value.success;
        }
        for (const child of Object.values(value)) {
            const found = walk(child);
            if (found != null) return found;
        }
        return null;
    };
    return walk(data) === true;
}

function formatCallTime(value: string | Date, locale: Locale, timeZone: string): string {
    return formatTime(value, { locale, timeZone });
}

function defaultCookStart(): Date {
    const result = new Date();
    result.setMinutes(result.getMinutes() + 60, 0, 0);
    return result;
}

function dateBucketKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function describeReason(reason: string | null | undefined, locale: Locale): string | null {
    if (!reason) return null;
    if (reason === 'ANOTHER_SLOT_CONFIRMED') {
        return { de: 'Ein anderer Termin wurde bestätigt.', en: 'Another slot was confirmed.' }[locale];
    }
    return reason;
}

function statusLabel(booking: BookingRequestOfferScheduleCallBooking, role: BookingRequestOfferScheduleRole, locale: Locale): string {
    switch (booking.status) {
        case 'CONFIRMED':
            return { de: 'Bestätigt', en: 'Confirmed' }[locale];
        case 'DECLINED':
            return { de: 'Abgelehnt', en: 'Declined' }[locale];
        case 'CANCELED':
            return { de: 'Abgesagt', en: 'Canceled' }[locale];
        case 'COMPLETED':
            return { de: 'Abgeschlossen', en: 'Completed' }[locale];
        case 'PENDING':
            if (role === 'user') {
                return booking.initiator === 'CUSTOMER'
                    ? { de: 'Warte auf Bestätigung', en: 'Awaiting confirmation' }[locale]
                    : { de: 'Wartet auf deine Reaktion', en: 'Awaiting your response' }[locale];
            }
            if (role === 'cook') {
                return booking.initiator === 'COOK'
                    ? { de: 'Wartet auf Kunden', en: 'Awaiting customer' }[locale]
                    : { de: 'Wartet auf deine Reaktion', en: 'Awaiting your response' }[locale];
            }
            return { de: 'Ausstehend', en: 'Pending' }[locale];
        default:
            return booking.status;
    }
}

function statusTone(booking: BookingRequestOfferScheduleCallBooking, role: BookingRequestOfferScheduleRole): StatusTone {
    switch (booking.status) {
        case 'CONFIRMED':
        case 'COMPLETED':
            return 'success';
        case 'DECLINED':
        case 'CANCELED':
            return 'error';
        case 'PENDING':
            if (role === 'user') {
                return booking.initiator === 'COOK' ? 'warning' : 'info';
            }
            if (role === 'cook') {
                return booking.initiator === 'CUSTOMER' ? 'warning' : 'info';
            }
            return 'info';
        default:
            return 'info';
    }
}

export function BookingRequestOfferScheduleTab({
    role,
    bookingRequestOfferId,
    callBookings,
    callSchedulingEnabled,
    callDurationMinutes,
    callSlots = [],
    peerDisplayName,
    requestDocument,
    confirmDocument,
    declineDocument,
    cancelDocument,
}: BookingRequestOfferScheduleTabProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const readOnly = role === 'admin' || !requestDocument;

    const [, requestMutation] = useMutation(requestDocument ?? ({} as DocumentInput));
    const [, confirmMutation] = useMutation(confirmDocument ?? ({} as DocumentInput));
    const [, declineMutation] = useMutation(declineDocument ?? ({} as DocumentInput));
    const [, cancelMutation] = useMutation(cancelDocument ?? ({} as DocumentInput));

    const [busy, setBusy] = useState(false);
    const [selectedSlotStartAt, setSelectedSlotStartAt] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [cookStart, setCookStart] = useState(() => defaultCookStart());
    const [decliningId, setDecliningId] = useState<string | null>(null);
    const [declineReason, setDeclineReason] = useState('');
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    const sortedBookings = useMemo(
        () => [...callBookings].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()),
        [callBookings],
    );
    const hasConfirmed = sortedBookings.some((booking) => booking.status === 'CONFIRMED');

    const dateBuckets = useMemo(() => {
        const slotsByDate = new Map<string, { date: Date; slots: BookingRequestOfferScheduleCallSlot[] }>();
        for (const slot of callSlots) {
            const startAt = new Date(slot.startAt);
            const key = dateBucketKey(startAt);
            const bucket = slotsByDate.get(key);
            if (bucket) {
                bucket.slots.push(slot);
            } else {
                slotsByDate.set(key, { date: startAt, slots: [slot] });
            }
        }
        return Array.from(slotsByDate.values()).sort((left, right) => left.date.getTime() - right.date.getTime());
    }, [callSlots]);

    async function submitRequest(startAt: Date) {
        if (readOnly || !requestDocument || busy) return;
        if (startAt.getTime() <= Date.now()) {
            toast.error({ de: 'Der gewählte Zeitpunkt liegt in der Vergangenheit.', en: 'The selected time is in the past.' }[locale]);
            return;
        }
        setBusy(true);
        try {
            const trimmed = message.trim();
            const variables =
                role === 'user'
                    ? {
                          bookingRequestOfferId,
                          startAt: startAt.toISOString(),
                          customerMessage: trimmed.length > 0 ? trimmed : null,
                      }
                    : {
                          bookingRequestOfferId,
                          startAt: startAt.toISOString(),
                          cookMessage: trimmed.length > 0 ? trimmed : null,
                      };
            const result = await requestMutation(variables);
            if (!mutationSucceeded(result.data)) {
                throw new Error('request failed');
            }
            setSelectedSlotStartAt(null);
            setMessage('');
            toast.success(
                {
                    de: 'Terminanfrage gesendet.',
                    en: 'Call request sent.',
                }[locale],
            );
        } catch {
            toast.error(
                {
                    de: 'Dieser Zeitpunkt ist nicht mehr verfügbar.',
                    en: 'This slot is no longer available.',
                }[locale],
            );
        } finally {
            setBusy(false);
        }
    }

    async function onConfirm(cookCallSlotBookingId: string) {
        if (readOnly || !confirmDocument || busy) return;
        setBusy(true);
        try {
            const result = await confirmMutation({ cookCallSlotBookingId });
            if (!mutationSucceeded(result.data)) throw new Error('confirm failed');
            toast.success({ de: 'Termin bestätigt.', en: 'Appointment confirmed.' }[locale]);
        } catch {
            toast.error({ de: 'Bestätigung fehlgeschlagen.', en: 'Could not confirm.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    async function onDecline(cookCallSlotBookingId: string) {
        if (readOnly || !declineDocument || busy) return;
        setBusy(true);
        try {
            const result = await declineMutation({
                cookCallSlotBookingId,
                reason: declineReason.trim() || null,
            });
            if (!mutationSucceeded(result.data)) throw new Error('decline failed');
            setDecliningId(null);
            setDeclineReason('');
            toast.success({ de: 'Termin abgelehnt.', en: 'Appointment declined.' }[locale]);
        } catch {
            toast.error({ de: 'Ablehnung fehlgeschlagen.', en: 'Could not decline.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    async function onCancel(cookCallSlotBookingId: string) {
        if (readOnly || !cancelDocument || busy) return;
        setBusy(true);
        try {
            const result = await cancelMutation({
                cookCallSlotBookingId,
                reason: cancelReason.trim() || null,
            });
            if (!mutationSucceeded(result.data)) throw new Error('cancel failed');
            setCancelingId(null);
            setCancelReason('');
            toast.success({ de: 'Termin abgesagt.', en: 'Appointment canceled.' }[locale]);
        } catch {
            toast.error({ de: 'Absage fehlgeschlagen.', en: 'Could not cancel.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    if (role === 'cook' && !callSchedulingEnabled) {
        return (
            <div className="grid max-w-xl gap-4">
                <StatusAlert
                    tone="warning"
                    title={{ de: 'Terminplanung deaktiviert', en: 'Call scheduling disabled' }[locale]}
                    action={
                        <Button type="button" size="sm" variant="outline" asChild>
                            <Link to="/{-$locale}/profile/calls">
                                {{ de: 'Verfügbarkeit einrichten', en: 'Set up availability' }[locale]}
                            </Link>
                        </Button>
                    }
                >
                    {
                        {
                            de: 'Aktiviere deine Gesprächszeiten unter Profil → Anrufe, um Termine vorzuschlagen.',
                            en: 'Enable your call hours under Profile → Calls to propose times.',
                        }[locale]
                    }
                </StatusAlert>
                {sortedBookings.length > 0 ? (
                    <div className="grid gap-3">
                        <p className="text-sm text-muted-foreground">{{ de: 'Bisherige Termine', en: 'Existing appointments' }[locale]}</p>
                        {sortedBookings.map((booking) => (
                            <BookingCard
                                key={booking.cookCallSlotBookingId}
                                booking={booking}
                                role={role}
                                locale={locale}
                                timeZone={timeZone}
                                callDurationMinutes={callDurationMinutes}
                                peerDisplayName={peerDisplayName}
                                busy={busy}
                                decliningId={decliningId}
                                declineReason={declineReason}
                                cancelingId={cancelingId}
                                cancelReason={cancelReason}
                                readOnly
                                setDecliningId={setDecliningId}
                                setDeclineReason={setDeclineReason}
                                setCancelingId={setCancelingId}
                                setCancelReason={setCancelReason}
                                onConfirm={onConfirm}
                                onDecline={onDecline}
                                onCancel={onCancel}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        );
    }

    const cookStartDate = cookStart;
    const cookEndDate = new Date(cookStartDate.getTime() + callDurationMinutes * MS_PER_MINUTE);
    const cookStartInPast = Number.isNaN(cookStartDate.getTime()) || cookStartDate.getTime() <= Date.now();

    return (
        <div className="grid max-w-xl gap-6">
            {role === 'admin' ? (
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Nur Ansicht. Termine bestätigen oder absagen die Parteien selbst.',
                            en: 'Read-only. Parties confirm or cancel appointments themselves.',
                        }[locale]
                    }
                </p>
            ) : null}

            {sortedBookings.length > 0 ? (
                <div className="grid gap-3">
                    <p className="text-sm text-muted-foreground">{{ de: 'Beratungsgespräche', en: 'Discovery calls' }[locale]}</p>
                    {sortedBookings.map((booking) => (
                        <BookingCard
                            key={booking.cookCallSlotBookingId}
                            booking={booking}
                            role={role}
                            locale={locale}
                            timeZone={timeZone}
                            callDurationMinutes={callDurationMinutes}
                            peerDisplayName={peerDisplayName}
                            busy={busy}
                            decliningId={decliningId}
                            declineReason={declineReason}
                            cancelingId={cancelingId}
                            cancelReason={cancelReason}
                            readOnly={readOnly}
                            setDecliningId={setDecliningId}
                            setDeclineReason={setDeclineReason}
                            setCancelingId={setCancelingId}
                            setCancelReason={setCancelReason}
                            onConfirm={onConfirm}
                            onDecline={onDecline}
                            onCancel={onCancel}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    {{ de: 'Bisher keine Terminanfragen für dieses Angebot.', en: 'No call requests for this offer yet.' }[locale]}
                </p>
            )}

            {!hasConfirmed && !readOnly && role === 'user' ? (
                <Card className={bookingOfferCallCardClassName}>
                    <CardHeader className={bookingOfferCallCardSectionClassName}>
                        <CardTitle>
                            {
                                {
                                    de: `${callDurationMinutes}-Minuten-Gespräch${peerDisplayName ? ` mit ${peerDisplayName}` : ''}`,
                                    en: `${callDurationMinutes}-minute call${peerDisplayName ? ` with ${peerDisplayName}` : ''}`,
                                }[locale]
                            }
                        </CardTitle>
                        <CardDescription>{{ de: 'Wähle einen Zeitpunkt', en: 'Pick a time' }[locale]}</CardDescription>
                    </CardHeader>
                    <CardContent className={cn('grid gap-4', bookingOfferCallCardSectionClassName)}>
                        {dateBuckets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {
                                    {
                                        de: 'Keine freien Termine in den nächsten 14 Tagen',
                                        en: 'No available slots in the next 14 days',
                                    }[locale]
                                }
                            </p>
                        ) : (
                            <div className="grid gap-4">
                                {dateBuckets.map((bucket) => (
                                    <div key={bucket.date.toISOString()} className="grid gap-2">
                                        <p className="text-sm font-medium">
                                            {formatDate(bucket.date, { locale, timeZone, weekday: true })}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {bucket.slots.map((slot) => {
                                                const start = new Date(slot.startAt);
                                                const disabled = start.getTime() <= Date.now();
                                                const selected = selectedSlotStartAt === slot.startAt;
                                                return (
                                                    <Button
                                                        key={slot.startAt}
                                                        type="button"
                                                        size="sm"
                                                        variant={selected ? 'default' : 'outline'}
                                                        disabled={disabled || busy}
                                                        onClick={() => setSelectedSlotStartAt(slot.startAt)}
                                                    >
                                                        {formatCallTime(start, locale, timeZone)}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedSlotStartAt ? (
                            <label className="grid gap-1.5 text-sm">
                                <span className="font-medium">
                                    {{ de: 'Nachricht an den Koch (optional)', en: 'Message to the chef (optional)' }[locale]}
                                </span>
                                <Textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} rows={3} />
                            </label>
                        ) : null}
                    </CardContent>
                    {selectedSlotStartAt ? (
                        <CardFooter className={cn('justify-end', bookingOfferCallCardSectionClassName)}>
                            <Button type="button" disabled={busy} onClick={() => void submitRequest(new Date(selectedSlotStartAt))}>
                                {{ de: 'Anfrage senden', en: 'Send request' }[locale]}
                            </Button>
                        </CardFooter>
                    ) : null}
                </Card>
            ) : null}

            {!hasConfirmed && !readOnly && role === 'cook' ? (
                <Card className={bookingOfferCallCardClassName}>
                    <CardHeader className={bookingOfferCallCardSectionClassName}>
                        <CardTitle>{{ de: 'Termin vorschlagen', en: 'Suggest a time' }[locale]}</CardTitle>
                        <CardDescription>
                            {
                                {
                                    de: `Schlage dem Kunden einen ${callDurationMinutes}-Minuten-Termin vor.`,
                                    en: `Propose a ${callDurationMinutes}-minute call to the customer.`,
                                }[locale]
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className={cn('grid gap-4', bookingOfferCallCardSectionClassName)}>
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">{{ de: 'Beginn', en: 'Start' }[locale]}</span>
                            <DateTimePicker
                                value={cookStart}
                                onValueChange={setCookStart}
                                placeholder={{ de: 'Datum und Uhrzeit wählen', en: 'Pick date and time' }[locale]}
                                timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                locale={DATE_FNS_LOCALE[locale]}
                                className="w-full"
                                disabled={busy}
                            />
                        </label>
                        {cookStartInPast ? (
                            <p className="text-sm text-destructive">
                                {
                                    {
                                        de: 'Der gewählte Zeitpunkt liegt in der Vergangenheit.',
                                        en: 'The selected time is in the past.',
                                    }[locale]
                                }
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {
                                    {
                                        de: `Endet um ${formatCallTime(cookEndDate, locale, timeZone)} Uhr`,
                                        en: `Ends at ${formatCallTime(cookEndDate, locale, timeZone)}`,
                                    }[locale]
                                }
                            </p>
                        )}
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">
                                {{ de: 'Nachricht an den Kunden (optional)', en: 'Message to the customer (optional)' }[locale]}
                            </span>
                            <Textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} rows={3} />
                        </label>
                    </CardContent>
                    <CardFooter className={cn('justify-end', bookingOfferCallCardSectionClassName)}>
                        <Button type="button" disabled={busy || cookStartInPast} onClick={() => void submitRequest(cookStartDate)}>
                            {{ de: 'Vorschlag senden', en: 'Send suggestion' }[locale]}
                        </Button>
                    </CardFooter>
                </Card>
            ) : null}
        </div>
    );
}

function BookingCard({
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
}: {
    booking: BookingRequestOfferScheduleCallBooking;
    role: BookingRequestOfferScheduleRole;
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
}) {
    const start = new Date(booking.startAt);
    const end = new Date(booking.endAt);
    const isPending = booking.status === 'PENDING';
    const isConfirmed = booking.status === 'CONFIRMED';
    const fromCustomer = booking.initiator === 'CUSTOMER';
    const fromCook = booking.initiator === 'COOK';
    const isDeclining = decliningId === booking.cookCallSlotBookingId;
    const isCanceling = cancelingId === booking.cookCallSlotBookingId;
    const reasonText = describeReason(booking.declineReason ?? booking.canceledReason, locale);
    const canRespondAsUser = role === 'user' && isPending && fromCook;
    const canRespondAsCook = role === 'cook' && isPending && fromCustomer;
    const canWithdrawAsUser = role === 'user' && isPending && fromCustomer;
    const canWithdrawAsCook = role === 'cook' && isPending && fromCook;
    const canCancelConfirmed = (role === 'user' || role === 'cook') && isConfirmed;
    const whenLabel = `${formatDate(start, { locale, timeZone, weekday: true })} · ${formatCallTime(start, locale, timeZone)}–${formatCallTime(end, locale, timeZone)}${locale === 'de' ? ' Uhr' : ''}`;

    const hasBody =
        Boolean(booking.customerMessage) ||
        Boolean(booking.cookMessage) ||
        Boolean(reasonText) ||
        (!readOnly && (canRespondAsUser || canRespondAsCook)) ||
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
                    <StatusBadge tone={statusTone(booking, role)}>{statusLabel(booking, role, locale)}</StatusBadge>
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
