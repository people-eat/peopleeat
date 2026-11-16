import { Link } from '@tanstack/react-router';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatDate, isCallJoinable } from '../../../shared';
import { callCalendarEventIcsInput } from '../../../shared/calendarEventContent';
import { COOK_CALL_DURATIONS_MINUTES, COOK_CALL_MAX_WEEKLY_RULES, formatMinuteOfDay } from '../../../shared/cookCallAvailability';
import {
    compareCookCallSlotBookings,
    cookCallSlotBookingStatusLabel,
    cookCallSlotBookingStatusTone,
} from '../../../shared/cookCallSlotBookingStatus';
import { AddToCalendarLink } from '../../components/AddToCalendarLink';
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
import {
    bookingOfferCallActionButtonClassName,
    bookingOfferCallActionsClassName,
    bookingOfferCallCardClassName,
    bookingOfferCallCardSectionClassName,
    BookingOfferCallWhen,
} from '../../components/BookingRequestOfferCallBookingCard';
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
import { downloadCalendarEvent } from '../../utils/downloadCalendarEvent';
import { localePath } from '../../utils/locale';
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

function schedulingEnabledConfirmCopy({ nextEnabled, locale }: { nextEnabled: boolean; locale: Locale }): {
    title: string;
    description: string;
    confirm: string;
} {
    if (nextEnabled) {
        return {
            title: t(locale, 'profileCook', 'calls.enableTitle'),
            description: t(locale, 'profileCook', 'calls.enableBody'),
            confirm: t(locale, 'profileCook', 'actions.enable'),
        };
    }

    return {
        title: t(locale, 'profileCook', 'calls.disableTitle'),
        description: t(locale, 'profileCook', 'calls.disableBody'),
        confirm: t(locale, 'profileCook', 'actions.disable'),
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
        return [...bookings].sort(compareCookCallSlotBookings);
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
                toast.error(t(locale, 'common', 'saveFailed'));
                return;
            }
            toast.success(pendingEnabled ? t(locale, 'profileCook', 'calls.enabled') : t(locale, 'profileCook', 'calls.disabled'));
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
                toast.error(t(locale, 'common', 'saveFailed'));
                return;
            }
            toast.success(t(locale, 'profileCook', 'calls.durationSet', { minutes: callDurationMinutes }));
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
                    toast.error(t(locale, 'common', 'saveFailed'));
                    return;
                }
            }
            const created = await createRule({ rule });
            if (created.error || !created.data?.user.cook.callAvailabilityRuleCreate.success) {
                toast.error(t(locale, 'common', 'saveFailed'));
                return;
            }
            setRuleDialogOpen(false);
            setEditingRule(null);
            toast.success(t(locale, 'profileCook', 'calls.windowSaved'));
        } finally {
            setRuleSaving(false);
        }
    }

    async function onDeleteRule(cookCallAvailabilityRuleId: string) {
        const result = await deleteRule({ cookCallAvailabilityRuleId });
        if (result.error || !result.data?.user.cook.callAvailabilityRuleDelete.success) {
            toast.error(t(locale, 'profileCook', 'actions.deleteFailed'));
            return;
        }
        toast.success(t(locale, 'profileCook', 'calls.windowDeleted'));
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
                toast.error(t(locale, 'common', 'saveFailed'));
                return;
            }
            setExceptionDialogOpen(false);
            toast.success(t(locale, 'profileCook', 'calls.exceptionSaved'));
        } finally {
            setExceptionSaving(false);
        }
    }

    async function onDeleteException(cookCallAvailabilityExceptionId: string) {
        const result = await deleteException({ cookCallAvailabilityExceptionId });
        if (result.error || !result.data?.user.cook.callAvailabilityExceptionDelete.success) {
            toast.error(t(locale, 'profileCook', 'actions.deleteFailed'));
            return;
        }
        toast.success(t(locale, 'profileCook', 'calls.exceptionDeleted'));
    }

    async function onConfirmBooking(cookCallSlotBookingId: string) {
        setSlotBusy(true);
        try {
            const result = await confirmSlot({ cookCallSlotBookingId });
            if (result.error || !result.data?.user.cook.bookingRequestOfferCallSlotConfirm.success) {
                toast.error(t(locale, 'profileCook', 'offer.confirmFailed'));
                return;
            }
            toast.success(t(locale, 'profileCook', 'calls.appointmentConfirmed'));
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
                toast.error(t(locale, 'profileCook', 'calls.declineFailed'));
                return;
            }
            setDecliningId(null);
            setDeclineReason('');
            toast.success(t(locale, 'profileCook', 'calls.requestDeclined'));
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
                toast.error(t(locale, 'profileCook', 'calls.cancelFailed'));
                return;
            }
            setCancelingId(null);
            setCancelReason('');
            toast.success(t(locale, 'profileCook', 'calls.appointmentCanceled'));
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
                <h1 className="font-serif text-3xl/tight text-foreground">{route.title(locale)}</h1>
                <p className="text-muted-foreground">{route.description(locale)}</p>
            </div>

            {sortedBookings.length > 0 ? (
                <section className="grid gap-4">
                    <div className="grid gap-1">
                        <h2 className="text-sm font-medium">{t(locale, 'profileCook', 'calls.scheduled')}</h2>
                        <p className="text-xs text-muted-foreground">{t(locale, 'profileCook', 'calls.scheduledHint')}</p>
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
                                        <div className="@container/call-when grid min-w-0 gap-0.5">
                                            <CardTitle className="font-medium">{booking.customer.display}</CardTitle>
                                            <p className="text-sm text-foreground">
                                                <BookingOfferCallWhen
                                                    start={start}
                                                    end={end}
                                                    locale={locale}
                                                    timeZone={timeZone}
                                                    peers={[{ name: booking.customer.display, timeZone: booking.customer.timeZone }]}
                                                />
                                            </p>
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
                                                        {t(locale, 'profileCook', 'actions.confirm')}
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
                                                        {t(locale, 'profileCook', 'actions.decline')}
                                                    </Button>
                                                    <Button asChild type="button" size="sm" variant="outline">
                                                        <Link
                                                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                            params={{ bookingRequestOfferId: booking.bookingRequestOfferId }}
                                                            search={{ tab: 'call' }}
                                                        >
                                                            {t(locale, 'profileCook', 'calls.viewOffer')}
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ) : null}

                                            {isPending && fromCustomer && isDeclining ? (
                                                <div className="grid gap-2 rounded-md bg-secondary/40">
                                                    <Textarea
                                                        value={declineReason}
                                                        onChange={(event) => setDeclineReason(event.target.value)}
                                                        placeholder={t(locale, 'profileCook', 'actions.optionalReason')}
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
                                                            {t(locale, 'common', 'cancel')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            disabled={slotBusy}
                                                            onClick={() => void onDeclineBooking(booking.cookCallSlotBookingId)}
                                                        >
                                                            {t(locale, 'profileCook', 'calls.sendDecline')}
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
                                                        {t(locale, 'profileCook', 'calls.withdrawSuggestion')}
                                                    </Button>
                                                    <Button asChild type="button" size="sm">
                                                        <Link
                                                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                            params={{ bookingRequestOfferId: booking.bookingRequestOfferId }}
                                                            search={{ tab: 'call' }}
                                                        >
                                                            {t(locale, 'profileCook', 'calls.viewOffer')}
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ) : null}

                                            {isConfirmed && !isCanceling ? (
                                                <div className={bookingOfferCallActionsClassName}>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className={cn(
                                                            bookingOfferCallActionButtonClassName,
                                                            '@min-[28rem]/call-card:mr-auto',
                                                        )}
                                                        disabled={slotBusy}
                                                        onClick={() => {
                                                            setCancelingId(booking.cookCallSlotBookingId);
                                                            setCancelReason('');
                                                        }}
                                                    >
                                                        {t(locale, 'profileCook', 'calls.cancelAppointment')}
                                                    </Button>
                                                    <AddToCalendarLink
                                                        appearance="action"
                                                        className={bookingOfferCallActionButtonClassName}
                                                        locale={locale}
                                                        onClick={() => {
                                                            const offerUrl = new URL(
                                                                localePath(
                                                                    locale,
                                                                    `/profile/booking-request-offers/${booking.bookingRequestOfferId}?tab=call`,
                                                                ),
                                                                window.location.origin,
                                                            ).href;
                                                            downloadCalendarEvent({
                                                                filename: 'peopleeat-call.ics',
                                                                ...callCalendarEventIcsInput({
                                                                    locale,
                                                                    peerName: booking.customer.display,
                                                                    occasion: booking.occasion,
                                                                    offerUrl,
                                                                    start,
                                                                    end,
                                                                    cookCallSlotBookingId: booking.cookCallSlotBookingId,
                                                                }),
                                                            });
                                                        }}
                                                    />
                                                    <Button
                                                        asChild
                                                        type="button"
                                                        size="sm"
                                                        className={bookingOfferCallActionButtonClassName}
                                                    >
                                                        <Link
                                                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                            params={{ bookingRequestOfferId: booking.bookingRequestOfferId }}
                                                            search={{ tab: 'call' }}
                                                        >
                                                            {joinable
                                                                ? t(locale, 'profileCook', 'calls.goToCall')
                                                                : t(locale, 'profileCook', 'calls.viewOffer')}
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ) : null}

                                            {isCanceling ? (
                                                <div className="grid gap-2 rounded-md bg-secondary/40">
                                                    <p className="text-sm font-medium">
                                                        {isConfirmed
                                                            ? t(locale, 'profileCook', 'calls.cancelAppointmentConfirm')
                                                            : t(locale, 'profileCook', 'calls.withdrawSuggestionConfirm')}
                                                    </p>
                                                    <Textarea
                                                        value={cancelReason}
                                                        onChange={(event) => setCancelReason(event.target.value)}
                                                        placeholder={t(locale, 'profileCook', 'actions.optionalReason')}
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
                                                            {t(locale, 'profileCook', 'actions.back')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            disabled={slotBusy}
                                                            onClick={() => void onCancelBooking(booking.cookCallSlotBookingId)}
                                                        >
                                                            {isConfirmed
                                                                ? t(locale, 'profileCook', 'calls.cancelAppointment')
                                                                : t(locale, 'profileCook', 'calls.withdrawSuggestion')}
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
                        <CardTitle>{t(locale, 'profileCook', 'calls.scheduling')}</CardTitle>
                        <CardDescription>{t(locale, 'profileCook', 'calls.schedulingHint')}</CardDescription>
                    </div>
                    <CardAction>
                        <Switch checked={enabled} disabled={settingsSaving} onCheckedChange={(checked) => setPendingEnabled(checked)} />
                    </CardAction>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <span className="text-sm font-medium">{t(locale, 'profileCook', 'calls.duration')}</span>
                    <Select value={duration} disabled={settingsSaving} onValueChange={(value) => void onDurationChange(value)}>
                        <SelectTrigger className="w-full max-w-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {COOK_CALL_DURATIONS_MINUTES.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option} {t(locale, 'profileCook', 'calls.minutes')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <div className={cn('grid gap-4', availabilityDisabled && 'pointer-events-none opacity-50')}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t(locale, 'profileCook', 'calls.myWindows')}</CardTitle>
                        <CardDescription>{t(locale, 'profileCook', 'calls.repeatsWeekly')}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {sortedRules.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'calls.noWindows')}</p>
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
                                            aria-label={t(locale, 'profileCook', 'actions.edit')}
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
                                            aria-label={t(locale, 'profileCook', 'actions.delete')}
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
                                    + {t(locale, 'profileCook', 'calls.addWindow')}
                                </Button>
                            </div>
                            {sortedRules.length >= COOK_CALL_MAX_WEEKLY_RULES ? (
                                <p className="text-xs text-muted-foreground">
                                    {t(locale, 'profileCook', 'calls.maxWindows', { count: COOK_CALL_MAX_WEEKLY_RULES })}
                                </p>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t(locale, 'profileCook', 'calls.exceptions')}</CardTitle>
                        <CardDescription>{t(locale, 'profileCook', 'calls.exceptionsHint')}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {sortedExceptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'calls.noExceptions')}</p>
                        ) : null}
                        <div className="grid gap-3">
                            {sortedExceptions.map((exception) => {
                                const typeLabel =
                                    exception.type === 'BLOCK'
                                        ? t(locale, 'profileCook', 'calls.blocked')
                                        : t(locale, 'profileCook', 'calls.extraAvailability');
                                const isAllDay = exception.startMinuteOfDay == null || exception.endMinuteOfDay == null;
                                const rangeLabel = isAllDay
                                    ? t(locale, 'profileCook', 'calls.allDay')
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
                                            aria-label={t(locale, 'profileCook', 'actions.delete')}
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
                                + {t(locale, 'profileCook', 'calls.addException')}
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
                        <AlertDialogCancel disabled={settingsSaving}>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            variant={pendingEnabled === false ? 'destructive' : 'default'}
                            disabled={settingsSaving}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmSchedulingEnabledChange();
                            }}
                        >
                            {settingsSaving
                                ? t(locale, 'profileCook', 'actions.saving')
                                : (schedulingConfirmCopy?.confirm ?? t(locale, 'profileCook', 'actions.confirm'))}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
