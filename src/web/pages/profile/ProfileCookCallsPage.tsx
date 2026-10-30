import { Link } from '@tanstack/react-router';
import { CalendarPlusIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { formatDate, formatTime, isCallJoinable } from '../../../shared';
import { COOK_CALL_DURATIONS_MINUTES, COOK_CALL_MAX_WEEKLY_RULES, formatMinuteOfDay } from '../../../shared/cookCallAvailability';
import { cookCallSlotBookingStatusLabel, cookCallSlotBookingStatusTone } from '../../../shared/cookCallSlotBookingStatus';
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
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/base/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { StatusBadge } from '../../components/base/status-badge';
import { Switch } from '../../components/base/switch';
import { Textarea } from '../../components/base/textarea';
import { bookingOfferCallCardClassName, bookingOfferCallCardSectionClassName } from '../../components/BookingRequestOfferScheduleTab';
import type { GqlCProfileCookCallsCookFragment, GqlCProfileCookCallsPageQuery } from '../../graphql/generated';
import {
    ProfileCookCallsCallSlotCancelDocument,
    ProfileCookCallsCallSlotConfirmDocument,
    ProfileCookCallsCallSlotDeclineDocument,
    ProfileCookCallsCookUpdateDocument,
    ProfileCookCallsExceptionCreateDocument,
    ProfileCookCallsExceptionDeleteDocument,
    ProfileCookCallsPageUpdatesDocument,
    ProfileCookCallsRuleCreateDocument,
    ProfileCookCallsRuleDeleteDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cn } from '../../utils/cn';
import { callCalendarEventCopy, downloadCalendarEvent } from '../../utils/downloadCalendarEvent';
import type { Locale } from '../../utils/locale';
import { cookNavRouteBySlug } from './cookCatalog';
import { ProfileCookCallsExceptionDialog } from './ProfileCookCallsExceptionDialog';
import { profileCookCallsPageVariables } from './profileCookCallsPageVariables';
import { ProfileCookCallsRuleDialog } from './ProfileCookCallsRuleDialog';

const route = cookNavRouteBySlug('calls');
export const profileCookCallsPageTitle = route.title;
export const profileCookCallsPageDescription = route.description;

function sortRules(rules: GqlCProfileCookCallsCookFragment['callAvailabilityRules']) {
    return [...rules].sort((left, right) => {
        if (left.dayOfWeek !== right.dayOfWeek) {
            const leftDay = left.dayOfWeek === 0 ? 7 : left.dayOfWeek;
            const rightDay = right.dayOfWeek === 0 ? 7 : right.dayOfWeek;
            return leftDay - rightDay;
        }
        return left.startMinuteOfDay - right.startMinuteOfDay;
    });
}

function sortExceptions(exceptions: GqlCProfileCookCallsCookFragment['callAvailabilityExceptions']) {
    return [...exceptions].sort((left, right) => {
        if (left.date !== right.date) {
            return left.date < right.date ? -1 : 1;
        }
        return (left.startMinuteOfDay ?? -1) - (right.startMinuteOfDay ?? -1);
    });
}

function formatCallTime(value: string, locale: Locale, timeZone: string): string {
    return formatTime(value, { locale, timeZone });
}

function schedulingEnabledConfirmCopy({ nextEnabled, locale }: { nextEnabled: boolean; locale: Locale }): {
    title: string;
    description: string;
    confirm: string;
} {
    if (nextEnabled) {
        return {
            title: { de: 'Anrufplanung aktivieren?', en: 'Enable call scheduling?' }[locale],
            description: {
                de: 'Gastgeber können kurze Kennenlerngespräche in deinen Zeitfenstern anfragen. Bestehende Termine bleiben unverändert.',
                en: 'Hosts can request short intro calls in your time windows. Existing appointments stay unchanged.',
            }[locale],
            confirm: { de: 'Aktivieren', en: 'Enable' }[locale],
        };
    }

    return {
        title: { de: 'Anrufplanung deaktivieren?', en: 'Disable call scheduling?' }[locale],
        description: {
            de: 'Neue Anfragen sind nicht mehr möglich. Bereits geplante Gespräche bleiben bestehen. Deine Zeitfenster und Ausnahmen bleiben gespeichert.',
            en: 'New requests will no longer be possible. Already scheduled calls stay in place. Your time windows and exceptions remain saved.',
        }[locale],
        confirm: { de: 'Deaktivieren', en: 'Disable' }[locale],
    };
}

export function ProfileCookCallsPage({ data }: { data: GqlCProfileCookCallsPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const pageVariables = useMemo(() => profileCookCallsPageVariables(), []);
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookCallsPageUpdatesDocument, pageVariables);
    const [, updateCook] = useMutation(ProfileCookCallsCookUpdateDocument);
    const [, createRule] = useMutation(ProfileCookCallsRuleCreateDocument);
    const [, deleteRule] = useMutation(ProfileCookCallsRuleDeleteDocument);
    const [, createException] = useMutation(ProfileCookCallsExceptionCreateDocument);
    const [, deleteException] = useMutation(ProfileCookCallsExceptionDeleteDocument);
    const [, confirmSlot] = useMutation(ProfileCookCallsCallSlotConfirmDocument);
    const [, declineSlot] = useMutation(ProfileCookCallsCallSlotDeclineDocument);
    const [, cancelSlot] = useMutation(ProfileCookCallsCallSlotCancelDocument);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
    const [ruleSaving, setRuleSaving] = useState(false);
    const [exceptionSaving, setExceptionSaving] = useState(false);
    const [slotBusy, setSlotBusy] = useState(false);
    const [decliningId, setDecliningId] = useState<string | null>(null);
    const [declineReason, setDeclineReason] = useState('');
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const cook = user?.cook ?? null;
    const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<GqlCProfileCookCallsCookFragment['callAvailabilityRules'][number] | null>(null);
    const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(id);
    }, []);

    const sortedRules = useMemo(() => sortRules(cook?.callAvailabilityRules ?? []), [cook?.callAvailabilityRules]);
    const sortedExceptions = useMemo(() => sortExceptions(cook?.callAvailabilityExceptions ?? []), [cook?.callAvailabilityExceptions]);
    const sortedBookings = useMemo(() => {
        const bookings = cook?.callSlotBookings ?? [];
        return [...bookings].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
    }, [cook?.callSlotBookings]);

    const dayLabels =
        locale === 'de'
            ? ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
            : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const schedulingConfirmCopy = pendingEnabled == null ? null : schedulingEnabledConfirmCopy({ nextEnabled: pendingEnabled, locale });

    async function confirmSchedulingEnabledChange() {
        if (!cook || pendingEnabled == null || settingsSaving || pendingEnabled === cook.callSchedulingEnabled) {
            setPendingEnabled(null);
            return;
        }
        setSettingsSaving(true);
        try {
            const result = await updateCook({
                input: { callSchedulingEnabled: pendingEnabled },
            });
            if (result.error || !result.data?.user.cook.update.success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }
            toast.success(
                pendingEnabled
                    ? { de: 'Anrufplanung aktiviert.', en: 'Call scheduling enabled.' }[locale]
                    : { de: 'Anrufplanung deaktiviert.', en: 'Call scheduling disabled.' }[locale],
            );
        } finally {
            setSettingsSaving(false);
            setPendingEnabled(null);
        }
    }

    async function onDurationChange(nextDuration: string) {
        if (!cook || settingsSaving) return;
        const callDurationMinutes = Number(nextDuration);
        if (callDurationMinutes === cook.callDurationMinutes) return;
        setSettingsSaving(true);
        try {
            const result = await updateCook({ input: { callDurationMinutes } });
            if (result.error || !result.data?.user.cook.update.success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }
            toast.success(
                {
                    de: `Gesprächsdauer auf ${callDurationMinutes} Minuten gesetzt.`,
                    en: `Call duration set to ${callDurationMinutes} minutes.`,
                }[locale],
            );
        } finally {
            setSettingsSaving(false);
        }
    }

    async function onSaveRule(rule: { dayOfWeek: number; startMinuteOfDay: number; endMinuteOfDay: number }) {
        setRuleSaving(true);
        try {
            if (editingRule) {
                const deleted = await deleteRule({ cookCallAvailabilityRuleId: editingRule.cookCallAvailabilityRuleId });
                if (deleted.error || !deleted.data?.user.cook.callAvailabilityRuleDelete.success) {
                    toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                    return;
                }
            }
            const created = await createRule({ rule });
            if (created.error || !created.data?.user.cook.callAvailabilityRuleCreate.success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }
            setRuleDialogOpen(false);
            setEditingRule(null);
            toast.success({ de: 'Zeitfenster gespeichert.', en: 'Time window saved.' }[locale]);
        } finally {
            setRuleSaving(false);
        }
    }

    async function onDeleteRule(cookCallAvailabilityRuleId: string) {
        const result = await deleteRule({ cookCallAvailabilityRuleId });
        if (result.error || !result.data?.user.cook.callAvailabilityRuleDelete.success) {
            toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete.' }[locale]);
            return;
        }
        toast.success({ de: 'Zeitfenster gelöscht.', en: 'Time window deleted.' }[locale]);
    }

    async function onSaveException(exception: {
        date: string;
        type: 'BLOCK' | 'OPEN';
        startMinuteOfDay: number | null;
        endMinuteOfDay: number | null;
    }) {
        setExceptionSaving(true);
        try {
            const result = await createException({ exception });
            if (result.error || !result.data?.user.cook.callAvailabilityExceptionCreate.success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }
            setExceptionDialogOpen(false);
            toast.success({ de: 'Ausnahme gespeichert.', en: 'Exception saved.' }[locale]);
        } finally {
            setExceptionSaving(false);
        }
    }

    async function onDeleteException(cookCallAvailabilityExceptionId: string) {
        const result = await deleteException({ cookCallAvailabilityExceptionId });
        if (result.error || !result.data?.user.cook.callAvailabilityExceptionDelete.success) {
            toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete.' }[locale]);
            return;
        }
        toast.success({ de: 'Ausnahme gelöscht.', en: 'Exception deleted.' }[locale]);
    }

    async function onConfirmBooking(cookCallSlotBookingId: string) {
        setSlotBusy(true);
        try {
            const result = await confirmSlot({ cookCallSlotBookingId });
            if (result.error || !result.data?.user.cook.bookingRequestOfferCallSlotConfirm.success) {
                toast.error({ de: 'Bestätigung fehlgeschlagen.', en: 'Could not confirm.' }[locale]);
                return;
            }
            toast.success({ de: 'Termin bestätigt.', en: 'Appointment confirmed.' }[locale]);
        } finally {
            setSlotBusy(false);
        }
    }

    async function onDeclineBooking(cookCallSlotBookingId: string) {
        setSlotBusy(true);
        try {
            const result = await declineSlot({
                cookCallSlotBookingId,
                reason: declineReason.trim() || null,
            });
            if (result.error || !result.data?.user.cook.bookingRequestOfferCallSlotDecline.success) {
                toast.error({ de: 'Ablehnung fehlgeschlagen.', en: 'Could not decline.' }[locale]);
                return;
            }
            setDecliningId(null);
            setDeclineReason('');
            toast.success({ de: 'Anfrage abgelehnt.', en: 'Request declined.' }[locale]);
        } finally {
            setSlotBusy(false);
        }
    }

    async function onCancelBooking(cookCallSlotBookingId: string) {
        setSlotBusy(true);
        try {
            const result = await cancelSlot({
                cookCallSlotBookingId,
                reason: cancelReason.trim() || null,
            });
            if (result.error || !result.data?.user.cook.bookingRequestOfferCallSlotCancel.success) {
                toast.error({ de: 'Absage fehlgeschlagen.', en: 'Could not cancel.' }[locale]);
                return;
            }
            setCancelingId(null);
            setCancelReason('');
            toast.success({ de: 'Termin abgesagt.', en: 'Appointment canceled.' }[locale]);
        } finally {
            setSlotBusy(false);
        }
    }

    if (!cook) {
        return null;
    }

    const enabled = cook.callSchedulingEnabled;
    const duration = String(cook.callDurationMinutes);
    const availabilityDisabled = !enabled;

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-3xl content-start gap-6">
            <div className="grid gap-2">
                <h1 className="font-serif text-3xl/tight text-foreground">{route.title[locale]}</h1>
                <p className="text-muted-foreground">{route.description[locale]}</p>
            </div>

            {sortedBookings.length > 0 ? (
                <section className="grid gap-4">
                    <div className="grid gap-1">
                        <h2 className="text-sm font-medium">{{ de: 'Geplante Gespräche', en: 'Scheduled calls' }[locale]}</h2>
                        <p className="text-xs text-muted-foreground">
                            {
                                {
                                    de: 'Ausstehende Anfragen und bestätigte Termine',
                                    en: 'Pending requests and confirmed appointments',
                                }[locale]
                            }
                        </p>
                    </div>
                    <div className="grid gap-3">
                        {sortedBookings.map((booking) => {
                            const start = new Date(booking.startAt);
                            const end = new Date(booking.endAt);
                            const isPending = booking.status === 'PENDING';
                            const isConfirmed = booking.status === 'CONFIRMED';
                            const fromCustomer = booking.initiator === 'CUSTOMER';
                            const fromCook = booking.initiator === 'COOK';
                            const isDeclining = decliningId === booking.cookCallSlotBookingId;
                            const isCanceling = cancelingId === booking.cookCallSlotBookingId;
                            const joinable = isCallJoinable(booking, now);
                            const whenLabel = `${formatDate(start, { locale, timeZone, weekday: true })} · ${formatCallTime(booking.startAt, locale, timeZone)}–${formatCallTime(booking.endAt, locale, timeZone)}${locale === 'de' ? ' Uhr' : ''}`;
                            const hasBody =
                                Boolean(booking.customerMessage) ||
                                Boolean(booking.cookMessage) ||
                                (isPending && fromCustomer) ||
                                (isPending && fromCook) ||
                                isConfirmed ||
                                isCanceling;

                            return (
                                <Card key={booking.cookCallSlotBookingId} className={bookingOfferCallCardClassName}>
                                    <CardHeader className={bookingOfferCallCardSectionClassName}>
                                        <div className="grid gap-0.5">
                                            <CardTitle className="font-medium">{booking.customer.display}</CardTitle>
                                            <p className="text-sm text-foreground">{whenLabel}</p>
                                        </div>
                                        <CardAction>
                                            <StatusBadge tone={cookCallSlotBookingStatusTone(booking, 'cook')}>
                                                {cookCallSlotBookingStatusLabel(booking, 'cook', locale)}
                                            </StatusBadge>
                                        </CardAction>
                                    </CardHeader>

                                    {hasBody ? (
                                        <CardContent className={cn('grid gap-3', bookingOfferCallCardSectionClassName)}>
                                            {booking.customerMessage ? (
                                                <p className="text-sm text-muted-foreground italic">{booking.customerMessage}</p>
                                            ) : null}
                                            {booking.cookMessage ? (
                                                <p className="text-sm text-muted-foreground italic">{booking.cookMessage}</p>
                                            ) : null}

                                            {isPending && fromCustomer && !isDeclining ? (
                                                <div className="flex flex-row-reverse flex-wrap justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        disabled={slotBusy}
                                                        onClick={() => void onConfirmBooking(booking.cookCallSlotBookingId)}
                                                    >
                                                        {{ de: 'Bestätigen', en: 'Confirm' }[locale]}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={slotBusy}
                                                        onClick={() => {
                                                            setDecliningId(booking.cookCallSlotBookingId);
                                                            setDeclineReason('');
                                                        }}
                                                    >
                                                        {{ de: 'Ablehnen', en: 'Decline' }[locale]}
                                                    </Button>
                                                    <Button asChild type="button" size="sm" variant="outline">
                                                        <Link
                                                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                            params={{ bookingRequestOfferId: booking.bookingRequestOfferId }}
                                                            search={{ tab: 'call' }}
                                                        >
                                                            {{ de: 'Angebot ansehen', en: 'View offer' }[locale]}
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ) : null}

                                            {isPending && fromCustomer && isDeclining ? (
                                                <div className="grid gap-2 rounded-md bg-secondary/40 p-3">
                                                    <Textarea
                                                        value={declineReason}
                                                        onChange={(event) => setDeclineReason(event.target.value)}
                                                        placeholder={{ de: 'Optionaler Grund', en: 'Optional reason' }[locale]}
                                                        rows={3}
                                                    />
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={slotBusy}
                                                            onClick={() => setDecliningId(null)}
                                                        >
                                                            {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            disabled={slotBusy}
                                                            onClick={() => void onDeclineBooking(booking.cookCallSlotBookingId)}
                                                        >
                                                            {{ de: 'Absage senden', en: 'Send decline' }[locale]}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {isPending && fromCook && !isCanceling ? (
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={slotBusy}
                                                        onClick={() => {
                                                            setCancelingId(booking.cookCallSlotBookingId);
                                                            setCancelReason('');
                                                        }}
                                                    >
                                                        {{ de: 'Vorschlag zurückziehen', en: 'Withdraw suggestion' }[locale]}
                                                    </Button>
                                                    <Button asChild type="button" size="sm">
                                                        <Link
                                                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                            params={{ bookingRequestOfferId: booking.bookingRequestOfferId }}
                                                            search={{ tab: 'call' }}
                                                        >
                                                            {{ de: 'Angebot ansehen', en: 'View offer' }[locale]}
                                                        </Link>
                                                    </Button>
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
                                                            downloadCalendarEvent({
                                                                start,
                                                                end,
                                                                title: `${copy.titlePrefix} ${booking.customer.display}`,
                                                                description: copy.description,
                                                                uid: `${booking.cookCallSlotBookingId}@peopleeat`,
                                                            });
                                                        }}
                                                    >
                                                        <CalendarPlusIcon className="size-4" aria-hidden />
                                                        {callCalendarEventCopy(locale).addToCalendar}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={slotBusy}
                                                        onClick={() => {
                                                            setCancelingId(booking.cookCallSlotBookingId);
                                                            setCancelReason('');
                                                        }}
                                                    >
                                                        {{ de: 'Termin absagen', en: 'Cancel appointment' }[locale]}
                                                    </Button>
                                                    <Button asChild type="button" size="sm">
                                                        <Link
                                                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                            params={{ bookingRequestOfferId: booking.bookingRequestOfferId }}
                                                            search={{ tab: 'call' }}
                                                        >
                                                            {
                                                                {
                                                                    de: joinable ? 'Zum Anruf' : 'Angebot ansehen',
                                                                    en: joinable ? 'Go to call' : 'View offer',
                                                                }[locale]
                                                            }
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ) : null}

                                            {isCanceling ? (
                                                <div className="grid gap-2 rounded-md bg-secondary/40 p-3">
                                                    <p className="text-sm font-medium">
                                                        {
                                                            {
                                                                de: isConfirmed
                                                                    ? 'Termin wirklich absagen?'
                                                                    : 'Vorschlag wirklich zurückziehen?',
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
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={slotBusy}
                                                            onClick={() => setCancelingId(null)}
                                                        >
                                                            {{ de: 'Zurück', en: 'Back' }[locale]}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            disabled={slotBusy}
                                                            onClick={() => void onCancelBooking(booking.cookCallSlotBookingId)}
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
                        })}
                    </div>
                </section>
            ) : null}

            <Card>
                <CardHeader>
                    <div className="grid gap-1">
                        <CardTitle>{{ de: 'Anrufplanung', en: 'Call scheduling' }[locale]}</CardTitle>
                        <CardDescription>
                            {
                                {
                                    de: 'Gastgeber können kurze Kennenlerngespräche anfragen.',
                                    en: 'Hosts can request short intro calls.',
                                }[locale]
                            }
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Switch checked={enabled} disabled={settingsSaving} onCheckedChange={(checked) => setPendingEnabled(checked)} />
                    </CardAction>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <span className="text-sm font-medium">{{ de: 'Gesprächsdauer', en: 'Call duration' }[locale]}</span>
                    <Select value={duration} disabled={settingsSaving} onValueChange={(value) => void onDurationChange(value)}>
                        <SelectTrigger className="w-full max-w-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {COOK_CALL_DURATIONS_MINUTES.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option} {{ de: 'Minuten', en: 'minutes' }[locale]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <div className={cn('grid gap-4', availabilityDisabled && 'pointer-events-none opacity-50')}>
                <Card>
                    <CardHeader>
                        <CardTitle>{{ de: 'Meine Zeitfenster', en: 'My time windows' }[locale]}</CardTitle>
                        <CardDescription>{{ de: 'Wiederholt sich wöchentlich', en: 'Repeats weekly' }[locale]}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {sortedRules.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {{ de: 'Noch keine Zeitfenster definiert.', en: 'No time windows defined yet.' }[locale]}
                            </p>
                        ) : null}
                        <div className="grid gap-3">
                            {sortedRules.map((rule) => (
                                <div
                                    key={rule.cookCallAvailabilityRuleId}
                                    className="flex items-center justify-between gap-4 rounded-xl border border-border p-3"
                                >
                                    <div className="grid gap-0.5">
                                        <span className="font-medium">{dayLabels[rule.dayOfWeek]}</span>
                                        <span className="text-sm">
                                            {formatMinuteOfDay(rule.startMinuteOfDay)} – {formatMinuteOfDay(rule.endMinuteOfDay)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                                            onClick={() => {
                                                setEditingRule(rule);
                                                setRuleDialogOpen(true);
                                            }}
                                        >
                                            <PencilIcon />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                                            onClick={() => void onDeleteRule(rule.cookCallAvailabilityRuleId)}
                                        >
                                            <Trash2Icon />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="grid gap-2">
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={sortedRules.length >= COOK_CALL_MAX_WEEKLY_RULES}
                                    onClick={() => {
                                        setEditingRule(null);
                                        setRuleDialogOpen(true);
                                    }}
                                >
                                    + {{ de: 'Zeitfenster hinzufügen', en: 'Add time window' }[locale]}
                                </Button>
                            </div>
                            {sortedRules.length >= COOK_CALL_MAX_WEEKLY_RULES ? (
                                <p className="text-xs text-muted-foreground">
                                    {
                                        {
                                            de: `Maximal ${COOK_CALL_MAX_WEEKLY_RULES} wöchentliche Zeitfenster erreicht.`,
                                            en: `Maximum of ${COOK_CALL_MAX_WEEKLY_RULES} weekly time windows reached.`,
                                        }[locale]
                                    }
                                </p>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{{ de: 'Ausnahmen', en: 'Exceptions' }[locale]}</CardTitle>
                        <CardDescription>
                            {
                                {
                                    de: 'Tage frei nehmen oder einmalige Zeitfenster anbieten',
                                    en: 'Take days off or offer one-off windows',
                                }[locale]
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {sortedExceptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{{ de: 'Keine Ausnahmen.', en: 'No exceptions.' }[locale]}</p>
                        ) : null}
                        <div className="grid gap-3">
                            {sortedExceptions.map((exception) => {
                                const typeLabel =
                                    exception.type === 'BLOCK'
                                        ? { de: 'Geblockt', en: 'Blocked' }[locale]
                                        : { de: 'Zusätzlich verfügbar', en: 'Extra availability' }[locale];
                                const isAllDay = exception.startMinuteOfDay == null || exception.endMinuteOfDay == null;
                                const rangeLabel = isAllDay
                                    ? { de: 'ganztägig', en: 'all day' }[locale]
                                    : `${formatMinuteOfDay(exception.startMinuteOfDay!)}–${formatMinuteOfDay(exception.endMinuteOfDay!)}`;
                                return (
                                    <div
                                        key={exception.cookCallAvailabilityExceptionId}
                                        className="flex items-center justify-between gap-4 rounded-xl border border-border p-3"
                                    >
                                        <div className="grid gap-0.5">
                                            <span className="font-medium">{typeLabel}</span>
                                            <span className="text-sm">
                                                {formatDate(exception.date, { locale, timeZone, dateStyle: 'long' })}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{rangeLabel}</span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                                            onClick={() => void onDeleteException(exception.cookCallAvailabilityExceptionId)}
                                        >
                                            <Trash2Icon />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-end">
                            <Button type="button" variant="outline" onClick={() => setExceptionDialogOpen(true)}>
                                + {{ de: 'Ausnahme hinzufügen', en: 'Add exception' }[locale]}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ProfileCookCallsRuleDialog
                open={ruleDialogOpen || editingRule !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRuleDialogOpen(false);
                        setEditingRule(null);
                    }
                }}
                initial={
                    editingRule
                        ? {
                              dayOfWeek: editingRule.dayOfWeek,
                              startMinuteOfDay: editingRule.startMinuteOfDay,
                              endMinuteOfDay: editingRule.endMinuteOfDay,
                          }
                        : null
                }
                onSave={onSaveRule}
                saving={ruleSaving}
            />

            <ProfileCookCallsExceptionDialog
                open={exceptionDialogOpen}
                onOpenChange={setExceptionDialogOpen}
                onSave={onSaveException}
                saving={exceptionSaving}
            />

            <AlertDialog
                open={pendingEnabled != null}
                onOpenChange={(open) => {
                    if (!open && !settingsSaving) setPendingEnabled(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{schedulingConfirmCopy?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{schedulingConfirmCopy?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={settingsSaving}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            variant={pendingEnabled === false ? 'destructive' : 'default'}
                            disabled={settingsSaving}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmSchedulingEnabledChange();
                            }}
                        >
                            {settingsSaving
                                ? { de: 'Speichern…', en: 'Saving…' }[locale]
                                : (schedulingConfirmCopy?.confirm ?? { de: 'Bestätigen', en: 'Confirm' }[locale])}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
