import { Link } from '@tanstack/react-router';
import type { DocumentInput } from '@urql/core';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { formatDate, formatTime } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './base/card';
import { DateTimePicker } from './base/date-time-picker';
import { StatusAlert } from './base/status-alert';
import { Textarea } from './base/textarea';
import {
    bookingOfferCallCardClassName,
    bookingOfferCallCardSectionClassName,
    BookingRequestOfferCallBookingCard,
} from './BookingRequestOfferCallBookingCard';
import type { BookingRequestOfferCallBookingCardBooking } from './BookingRequestOfferCallBookingCard';

export { bookingOfferCallCardClassName, bookingOfferCallCardSectionClassName };

export type BookingRequestOfferScheduleCallBooking = BookingRequestOfferCallBookingCardBooking;

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

function defaultProposeStart(): Date {
    const result = new Date();
    result.setMinutes(result.getMinutes() + 60, 0, 0);
    return result;
}

function dateBucketKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatCallTime(value: string | Date, locale: Locale, timeZone: string): string {
    return formatTime(value, { locale, timeZone });
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
    // Admin stays off propose / confirm / cancel; decline is enabled when a decline doc is passed.
    const readOnly = role === 'admin' ? !declineDocument : !requestDocument;

    const [, requestMutation] = useMutation(requestDocument ?? ({} as DocumentInput));
    const [, confirmMutation] = useMutation(confirmDocument ?? ({} as DocumentInput));
    const [, declineMutation] = useMutation(declineDocument ?? ({} as DocumentInput));
    const [, cancelMutation] = useMutation(cancelDocument ?? ({} as DocumentInput));

    const [busy, setBusy] = useState(false);
    const [selectedSlotStartAt, setSelectedSlotStartAt] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [proposeStart, setProposeStart] = useState(() => defaultProposeStart());
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
        const booking = sortedBookings.find((row) => row.cookCallSlotBookingId === cookCallSlotBookingId);
        if (!booking || booking.status !== 'PENDING') return;
        setBusy(true);
        try {
            const reason = declineReason.trim() || null;
            const result = await declineMutation(
                role === 'admin'
                    ? {
                          cookCallSlotBookingId,
                          // Counterparty of the initiator — admin declines in their name.
                          onBehalfOf: booking.initiator === 'COOK' ? 'CUSTOMER' : 'COOK',
                          reason,
                      }
                    : {
                          cookCallSlotBookingId,
                          reason,
                      },
            );
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
                            <BookingRequestOfferCallBookingCard
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

    const proposeStartDate = proposeStart;
    const proposeEndDate = new Date(proposeStartDate.getTime() + callDurationMinutes * MS_PER_MINUTE);
    const proposeStartInPast = Number.isNaN(proposeStartDate.getTime()) || proposeStartDate.getTime() <= Date.now();
    const canPropose = !hasConfirmed && !readOnly && (role === 'user' || role === 'cook');

    return (
        <div className="grid max-w-xl gap-6">
            {role === 'admin' ? (
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Ausstehende Anfragen kannst du im Namen von Kunde oder Koch ablehnen. Bestätigen und absagen bleiben bei den Parteien.',
                            en: 'You can decline pending requests on behalf of the customer or chef. Confirm and cancel stay with the parties.',
                        }[locale]
                    }
                </p>
            ) : null}

            {sortedBookings.length > 0 ? (
                <div className="grid gap-3">
                    <p className="text-sm text-muted-foreground">{{ de: 'Beratungsgespräche', en: 'Discovery calls' }[locale]}</p>
                    {sortedBookings.map((booking) => (
                        <BookingRequestOfferCallBookingCard
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

            {canPropose ? (
                <Card className={bookingOfferCallCardClassName}>
                    <CardHeader className={bookingOfferCallCardSectionClassName}>
                        <CardTitle>{{ de: 'Termin vorschlagen', en: 'Suggest a time' }[locale]}</CardTitle>
                        <CardDescription>
                            {
                                (role === 'user'
                                    ? {
                                          de: `Schlage dem Koch einen ${callDurationMinutes}-Minuten-Termin vor, auch außerhalb der gelisteten Zeiten.`,
                                          en: `Propose a ${callDurationMinutes}-minute call to the chef, including times outside the listed slots.`,
                                      }
                                    : {
                                          de: `Schlage dem Kunden einen ${callDurationMinutes}-Minuten-Termin vor.`,
                                          en: `Propose a ${callDurationMinutes}-minute call to the customer.`,
                                      })[locale]
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className={cn('grid gap-4', bookingOfferCallCardSectionClassName)}>
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">{{ de: 'Beginn', en: 'Start' }[locale]}</span>
                            <DateTimePicker
                                value={proposeStart}
                                onValueChange={setProposeStart}
                                placeholder={{ de: 'Datum und Uhrzeit wählen', en: 'Pick date and time' }[locale]}
                                timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                locale={DATE_FNS_LOCALE[locale]}
                                className="w-full"
                                disabled={busy}
                            />
                        </label>
                        {proposeStartInPast ? (
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
                                        de: `Endet um ${formatCallTime(proposeEndDate, locale, timeZone)} Uhr`,
                                        en: `Ends at ${formatCallTime(proposeEndDate, locale, timeZone)}`,
                                    }[locale]
                                }
                            </p>
                        )}
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">
                                {
                                    (role === 'user'
                                        ? { de: 'Nachricht an den Koch (optional)', en: 'Message to the chef (optional)' }
                                        : { de: 'Nachricht an den Kunden (optional)', en: 'Message to the customer (optional)' })[locale]
                                }
                            </span>
                            <Textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} rows={3} />
                        </label>
                    </CardContent>
                    <CardFooter className={cn('justify-end', bookingOfferCallCardSectionClassName)}>
                        <Button type="button" disabled={busy || proposeStartInPast} onClick={() => void submitRequest(proposeStartDate)}>
                            {{ de: 'Vorschlag senden', en: 'Send suggestion' }[locale]}
                        </Button>
                    </CardFooter>
                </Card>
            ) : null}
        </div>
    );
}
