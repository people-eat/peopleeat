import { Link } from '@tanstack/react-router';
import type { DocumentInput } from '@urql/core';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../i18n/t';
import { formatBookingCallScheduleCaption, formatDate, formatTime } from '../../shared';
import type { BookingWhenPeer } from '../../shared';
import { compareCookCallSlotBookings } from '../../shared/cookCallSlotBookingStatus';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import { localePath } from '../utils/locale';
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
    callTimePeers?: readonly BookingWhenPeer[];
    occasion?: string | null;
    /** Customer offer URLs need the request id. Cook URLs use the offer id only. */
    bookingRequestId?: string;
    requestDocument?: DocumentInput;
    confirmDocument?: DocumentInput;
    declineDocument?: DocumentInput;
    cancelDocument?: DocumentInput;
};

const MS_PER_MINUTE = 60_000;

function confirmedCallOfferUrl(
    role: BookingRequestOfferScheduleRole,
    locale: Locale,
    bookingRequestOfferId: string,
    bookingRequestId: string | undefined,
): string | undefined {
    if (role === 'admin' || typeof window === 'undefined') return undefined;
    const path =
        role === 'cook'
            ? localePath(locale, `/profile/booking-request-offers/${bookingRequestOfferId}?tab=call`)
            : bookingRequestId
              ? localePath(locale, `/profile/booking-requests/${bookingRequestId}/offers/${bookingRequestOfferId}?tab=call`)
              : undefined;
    if (!path) return undefined;
    return new URL(path, window.location.origin).href;
}

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
    callTimePeers,
    occasion,
    bookingRequestId,
    requestDocument,
    confirmDocument,
    declineDocument,
    cancelDocument,
}: BookingRequestOfferScheduleTabProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    // Admin stays off propose / confirm / cancel; decline is enabled when a decline doc is passed.
    const readOnly = role === 'admin' ? !declineDocument : !requestDocument;
    const calendarOfferUrl = confirmedCallOfferUrl(role, locale, bookingRequestOfferId, bookingRequestId);

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

    const sortedBookings = useMemo(() => [...callBookings].sort(compareCookCallSlotBookings), [callBookings]);
    const hasConfirmed = sortedBookings.some((booking) => booking.status === 'CONFIRMED');
    const scheduleCaption = formatBookingCallScheduleCaption({
        locale,
        viewerTimeZone: timeZone,
        peers: callTimePeers ?? [],
    });

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
            toast.error(t(locale, 'common', 'schedule.timeInPast'));
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
            toast.success(t(locale, 'common', 'schedule.requestSent'));
        } catch {
            toast.error(t(locale, 'common', 'schedule.slotUnavailable'));
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
            toast.success(t(locale, 'common', 'schedule.confirmed'));
        } catch {
            toast.error(t(locale, 'common', 'schedule.confirmFailed'));
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
            toast.success(t(locale, 'common', 'schedule.declined'));
        } catch {
            toast.error(t(locale, 'common', 'schedule.declineFailed'));
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
            toast.success(t(locale, 'common', 'schedule.canceled'));
        } catch {
            toast.error(t(locale, 'common', 'schedule.cancelFailed'));
        } finally {
            setBusy(false);
        }
    }

    if (role === 'cook' && !callSchedulingEnabled) {
        return (
            <div className="grid max-w-xl gap-4">
                <StatusAlert
                    tone="warning"
                    title={t(locale, 'common', 'schedule.disabledTitle')}
                    action={
                        <Button type="button" size="sm" variant="outline" asChild>
                            <Link to="/{-$locale}/profile/calls">{t(locale, 'common', 'schedule.setUpAvailability')}</Link>
                        </Button>
                    }
                >
                    {t(locale, 'common', 'schedule.enableHours')}
                </StatusAlert>
                {sortedBookings.length > 0 ? (
                    <div className="grid gap-3">
                        <p className="text-sm text-muted-foreground">{t(locale, 'common', 'schedule.existingAppointments')}</p>
                        {sortedBookings.map((booking) => (
                            <BookingRequestOfferCallBookingCard
                                key={booking.cookCallSlotBookingId}
                                booking={booking}
                                role={role}
                                locale={locale}
                                timeZone={timeZone}
                                callDurationMinutes={callDurationMinutes}
                                peerDisplayName={peerDisplayName}
                                callTimePeers={callTimePeers}
                                calendarOfferUrl={calendarOfferUrl}
                                occasion={occasion}
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
            {role === 'admin' ? <p className="text-sm text-muted-foreground">{t(locale, 'common', 'schedule.adminDeclineHint')}</p> : null}

            {sortedBookings.length > 0 ? (
                <div className="grid gap-3">
                    <p className="text-sm text-muted-foreground">{t(locale, 'common', 'schedule.discoveryCalls')}</p>
                    {sortedBookings.map((booking) => (
                        <BookingRequestOfferCallBookingCard
                            key={booking.cookCallSlotBookingId}
                            booking={booking}
                            role={role}
                            locale={locale}
                            timeZone={timeZone}
                            callDurationMinutes={callDurationMinutes}
                            peerDisplayName={peerDisplayName}
                            callTimePeers={callTimePeers}
                            calendarOfferUrl={calendarOfferUrl}
                            occasion={occasion}
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
                <p className="text-sm text-muted-foreground">{t(locale, 'common', 'schedule.noneYet')}</p>
            )}

            {!hasConfirmed && !readOnly && role === 'user' ? (
                <Card className={bookingOfferCallCardClassName}>
                    <CardHeader className={bookingOfferCallCardSectionClassName}>
                        <CardTitle>
                            {t(locale, 'common', 'schedule.callDurationWithPeer', {
                                minutes: callDurationMinutes,
                                peerPart: peerDisplayName ? t(locale, 'common', 'schedule.peerPart', { name: peerDisplayName }) : '',
                            })}
                        </CardTitle>
                        <CardDescription>{t(locale, 'common', 'schedule.pickATime')}</CardDescription>
                    </CardHeader>
                    <CardContent className={cn('grid gap-4', bookingOfferCallCardSectionClassName)}>
                        {scheduleCaption ? <p className="text-sm text-muted-foreground">{scheduleCaption}</p> : null}
                        {dateBuckets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t(locale, 'common', 'schedule.noSlots')}</p>
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
                                <span className="font-medium">{t(locale, 'common', 'schedule.messageToChef')}</span>
                                <Textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} rows={3} />
                            </label>
                        ) : null}
                    </CardContent>
                    {selectedSlotStartAt ? (
                        <CardFooter className={cn('justify-end', bookingOfferCallCardSectionClassName)}>
                            <Button type="button" disabled={busy} onClick={() => void submitRequest(new Date(selectedSlotStartAt))}>
                                {t(locale, 'common', 'schedule.sendRequest')}
                            </Button>
                        </CardFooter>
                    ) : null}
                </Card>
            ) : null}

            {canPropose ? (
                <Card className={bookingOfferCallCardClassName}>
                    <CardHeader className={bookingOfferCallCardSectionClassName}>
                        <CardTitle>{t(locale, 'common', 'schedule.suggestATime')}</CardTitle>
                        <CardDescription>
                            {t(locale, 'common', role === 'user' ? 'schedule.proposeToCook' : 'schedule.proposeToCustomer', {
                                minutes: callDurationMinutes,
                            })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className={cn('grid gap-4', bookingOfferCallCardSectionClassName)}>
                        {scheduleCaption ? <p className="text-sm text-muted-foreground">{scheduleCaption}</p> : null}
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">{t(locale, 'common', 'schedule.start')}</span>
                            <DateTimePicker
                                value={proposeStart}
                                onValueChange={setProposeStart}
                                placeholder={t(locale, 'common', 'schedule.pickDateAndTime')}
                                timeAriaLabel={t(locale, 'common', 'schedule.time')}
                                locale={DATE_FNS_LOCALE[locale]}
                                className="w-full"
                                disabled={busy}
                            />
                        </label>
                        {proposeStartInPast ? (
                            <p className="text-sm text-destructive">{t(locale, 'common', 'schedule.timeInPast')}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t(locale, 'common', 'schedule.endsAt', {
                                    time: formatCallTime(proposeEndDate, locale, timeZone),
                                })}
                            </p>
                        )}
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">
                                {t(locale, 'common', role === 'user' ? 'schedule.messageToChef' : 'schedule.messageToCustomer')}
                            </span>
                            <Textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} rows={3} />
                        </label>
                    </CardContent>
                    <CardFooter className={cn('justify-end', bookingOfferCallCardSectionClassName)}>
                        <Button type="button" disabled={busy || proposeStartInPast} onClick={() => void submitRequest(proposeStartDate)}>
                            {t(locale, 'common', 'schedule.sendSuggestion')}
                        </Button>
                    </CardFooter>
                </Card>
            ) : null}
        </div>
    );
}
