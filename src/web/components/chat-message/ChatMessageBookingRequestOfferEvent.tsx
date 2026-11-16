import type { LucideIcon } from 'lucide-react';
import {
    ArrowRightLeftIcon,
    BanknoteIcon,
    CalendarIcon,
    CircleCheckIcon,
    CircleXIcon,
    ClockIcon,
    FilePlusIcon,
    MapPinIcon,
    PackagePlusIcon,
    PhoneIcon,
    SlidersHorizontalIcon,
    UsersIcon,
    UtensilsIcon,
    VideoIcon,
} from 'lucide-react';

import { t } from '../../../i18n/t';
import {
    bookingRequestOfferPriceCalculate,
    formatBookingCallWhen,
    formatBookingWhenJoined,
    formatCurrency,
    formatDate,
    formatTime,
} from '../../../shared';
import type { BookingWhenPeer, Locale } from '../../../shared';
import type { GqlCChatMessageBookingRequestOfferEvent, GqlCChatMessageBookingRequestOfferEventType } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { cn } from '../../utils/cn';
import type { StatusTone } from '../base/status';
import { statusBadgeToneClass, statusIconToneClass } from '../base/status';
import { useBookingOfferTimeContext } from '../BookingOfferTimeContext';
import { MessageRow, Timestamp } from './shared';

/** Compact centered milestone pill for a booking-request offer domain event. */
export function ChatMessageBookingRequestOfferEventView({ message }: { message: GqlCChatMessageBookingRequestOfferEvent }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const callPeers = useBookingOfferTimeContext()?.callPeers ?? [];
    const label = chatMessageBookingRequestOfferEventLabel(message.type, locale);
    const detail = chatMessageBookingRequestOfferEventDetail(message, locale, timeZone, callPeers);
    const tone = offerEventTone(message.type);
    const Icon = offerEventIcon(message.type);

    return (
        <MessageRow side="milestone">
            <div data-slot="chat-message-offer-event-row" className="flex w-full items-center gap-2">
                <span aria-hidden className="h-px min-w-3 flex-1 bg-border/60" />
                <div
                    data-slot="chat-message-offer-event"
                    data-tone={tone}
                    data-type={message.type}
                    className={cn(
                        'inline-flex max-w-[min(100%,17rem)] items-center gap-1.5 rounded-full border px-2.5 py-1 text-left shadow-none',
                        statusBadgeToneClass[tone],
                    )}
                >
                    <span
                        aria-hidden
                        className={cn(
                            'inline-flex size-5 shrink-0 items-center justify-center rounded-full [&_svg]:size-3',
                            statusIconToneClass[tone],
                        )}
                    >
                        <Icon />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-xs/tight font-medium text-foreground">{label}</p>
                        <p className="mt-px flex min-w-0 items-baseline gap-x-1.5 text-[10px]/tight text-muted-foreground">
                            {detail ? <span className="min-w-0 truncate tabular-nums text-foreground/70">{detail}</span> : null}
                            <Timestamp iso={message.createdAt} className="mt-0 shrink-0 inline text-[10px] opacity-70" />
                        </p>
                    </div>
                </div>
                <span aria-hidden className="h-px min-w-3 flex-1 bg-border/60" />
            </div>
        </MessageRow>
    );
}

function offerEventTone(type: GqlCChatMessageBookingRequestOfferEventType): StatusTone {
    switch (type) {
        case 'COOK_CREATED':
        case 'COOK_ACCEPTED':
        case 'USER_ACCEPTED':
        case 'COOK_CALL_SLOT_CONFIRMED':
        case 'USER_CALL_SLOT_CONFIRMED':
        case 'SYSTEM_PAYMENT_SETUP':
        case 'SYSTEM_PAYMENT_SUCCEEDED':
        case 'ADMIN_PAYOUT_RELEASED':
        case 'ADMIN_PAYED_OUT_OF_SYSTEM':
            return 'success';
        case 'COOK_DECLINED':
        case 'USER_DECLINED':
        case 'USER_CANCELLED':
        case 'ADMIN_HANDED_OVER_CLOSED':
        case 'COOK_CALL_SLOT_DECLINED':
        case 'USER_CALL_SLOT_DECLINED':
        case 'COOK_CALL_SLOT_CANCELLED':
        case 'USER_CALL_SLOT_CANCELLED':
        case 'SYSTEM_PAYMENT_FAILED':
            return 'error';
        case 'ADMIN_HANDED_OVER_TO_COOK':
            return 'info';
        default:
            return 'info';
    }
}

function offerEventIcon(type: GqlCChatMessageBookingRequestOfferEventType): LucideIcon {
    switch (type) {
        case 'COOK_CREATED':
            return FilePlusIcon;
        case 'COOK_ACCEPTED':
        case 'USER_ACCEPTED':
        case 'COOK_CALL_SLOT_CONFIRMED':
        case 'USER_CALL_SLOT_CONFIRMED':
            return CircleCheckIcon;
        case 'COOK_DECLINED':
        case 'USER_DECLINED':
        case 'USER_CANCELLED':
        case 'ADMIN_HANDED_OVER_CLOSED':
        case 'COOK_CALL_SLOT_DECLINED':
        case 'USER_CALL_SLOT_DECLINED':
        case 'COOK_CALL_SLOT_CANCELLED':
        case 'USER_CALL_SLOT_CANCELLED':
            return CircleXIcon;
        case 'ADMIN_HANDED_OVER_TO_COOK':
            return ArrowRightLeftIcon;
        case 'COOK_CHANGED_PRICE':
        case 'SYSTEM_CHANGED_PRICE':
        case 'ADMIN_CHANGED_PRICE':
        case 'SYSTEM_PAYMENT_SETUP':
        case 'SYSTEM_PAYMENT_SUCCEEDED':
        case 'ADMIN_PAYOUT_RELEASED':
        case 'ADMIN_PAYED_OUT_OF_SYSTEM':
            return BanknoteIcon;
        case 'COOK_CHANGED_ADDONS':
        case 'USER_CHANGED_ADDON_SELECTION':
        case 'ADMIN_CHANGED_ADDONS':
            return PackagePlusIcon;
        case 'SYSTEM_PAYMENT_FAILED':
            return CircleXIcon;
        case 'COOK_UPDATED_SUGGESTED_MENU':
        case 'USER_REQUESTED_MENU_CHANGES':
        case 'USER_CONFIGURED_MENU':
        case 'ADMIN_CONFIGURED_MENU_UPDATED':
            return UtensilsIcon;
        case 'ADMIN_ACCEPTANCE_UPDATED':
            return CircleCheckIcon;
        case 'ADMIN_PAYMENT_SCHEDULE_UPDATED':
            return CalendarIcon;
        case 'USER_CALL_SLOT_REQUESTED':
        case 'COOK_CALL_SLOT_REQUESTED':
            return PhoneIcon;
        case 'USER_CALL_STARTED':
        case 'COOK_CALL_STARTED':
        case 'ADMIN_CALL_STARTED':
            return VideoIcon;
        case 'USER_PARTICIPANTS_UPDATED':
        case 'USER_PARTICIPANT_AMENDMENT_REQUESTED':
        case 'USER_PARTICIPANT_AMENDMENT_CANCELED':
        case 'COOK_PARTICIPANT_AMENDMENT_ACCEPTED':
        case 'COOK_PARTICIPANT_AMENDMENT_DECLINED':
        case 'ADMIN_PARTICIPANT_AMENDMENT_REQUESTED':
        case 'ADMIN_PARTICIPANT_AMENDMENT_APPLIED':
            return UsersIcon;
        case 'COOK_PREPARATIONS_COMPLETED':
        case 'ADMIN_PREPARATIONS_CLEARED':
            return UtensilsIcon;
        case 'USER_LOCATION_UPDATED':
            return MapPinIcon;
        case 'USER_DATE_UPDATED':
            return CalendarIcon;
        case 'USER_TIME_UPDATED':
            return ClockIcon;
        case 'USER_RESTRICTIONS_UPDATED':
        case 'USER_PREFERENCES_UPDATED':
            return SlidersHorizontalIcon;
        default:
            return FilePlusIcon;
    }
}

function chatMessageBookingRequestOfferEventLabel(type: GqlCChatMessageBookingRequestOfferEventType, locale: Locale): string {
    return t(locale, 'common', `offerEvent.${type}`);
}

function chatMessageBookingRequestOfferEventDetail(
    message: GqlCChatMessageBookingRequestOfferEvent,
    locale: Locale,
    timeZone: string,
    peers: readonly BookingWhenPeer[] = [],
): string | null {
    const payload = message.payload;
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
    const record = payload as Record<string, unknown>;

    if (message.type === 'ADMIN_HANDED_OVER_CLOSED' && typeof record.cookNameAfter === 'string') {
        return record.cookNameAfter.trim() || null;
    }
    if (message.type === 'ADMIN_HANDED_OVER_TO_COOK' && typeof record.cookNameBefore === 'string') {
        const cookNameBefore = record.cookNameBefore.trim();
        if (cookNameBefore.length === 0) return null;
        if (record.chatCopied === true) {
            return t(locale, 'common', 'offerEvent.priorChatCopied', { cookName: cookNameBefore });
        }
        return cookNameBefore;
    }
    if (typeof record.reason === 'string' && record.reason.trim().length > 0) {
        if (record.reason === 'ANOTHER_SLOT_CONFIRMED') {
            return t(locale, 'common', 'offerEvent.anotherSlotConfirmed');
        }
        if (record.reason === 'HANDED_OVER') {
            return t(locale, 'common', 'offerEvent.handedOver');
        }
        return record.reason.trim();
    }
    if (typeof record.declineReason === 'string' && record.declineReason.trim().length > 0) {
        return record.declineReason.trim();
    }
    if (typeof record.startAt === 'string') {
        const start = new Date(record.startAt);
        if (!Number.isNaN(start.getTime())) {
            const datePart = formatDate(start, { locale, timeZone, dateStyle: 'medium' });
            const startTime = formatTime(start, { locale, timeZone });
            if (typeof record.endAt === 'string') {
                const end = new Date(record.endAt);
                if (!Number.isNaN(end.getTime())) {
                    return formatBookingWhenJoined(
                        formatBookingCallWhen({
                            startAt: start,
                            endAt: end,
                            locale,
                            viewerTimeZone: timeZone,
                            peers,
                        }),
                    );
                }
            }
            return `${datePart} · ${startTime}`;
        }
    }
    if (typeof record.messageBody === 'string' && record.messageBody.trim().length > 0) {
        return record.messageBody.trim();
    }
    if (typeof record.customerMessage === 'string' && record.customerMessage.trim().length > 0) {
        return record.customerMessage.trim();
    }
    if (typeof record.cookMessage === 'string' && record.cookMessage.trim().length > 0) {
        return record.cookMessage.trim();
    }
    if (typeof record.amountCents === 'number') {
        if (message.type === 'SYSTEM_PAYMENT_SUCCEEDED' && record.source === 'PULL') {
            return t(locale, 'common', 'offerEvent.cardCharge', {
                amount: formatCurrency(record.amountCents, { locale }),
            });
        }
        return formatCurrency(record.amountCents, { locale });
    }
    if (typeof record.totalWithoutDiscountsCentsCustomer === 'number') {
        return formatCurrency(record.totalWithoutDiscountsCentsCustomer, { locale });
    }
    if (isPriceSnapshot(record.priceAfter)) {
        return formatCurrency(record.priceAfter.totalWithoutDiscountsCentsCustomer, { locale });
    }
    // Legacy COOK_CREATED: only menuPriceCents was stored — approximate customer total with zero travel.
    if (typeof record.menuPriceCents === 'number') {
        return formatCurrency(
            bookingRequestOfferPriceCalculate({
                menuPriceCents: record.menuPriceCents,
                travelExpensesCents: 0,
            }).totalWithoutDiscountsCentsCustomer,
            { locale },
        );
    }
    return null;
}

function isPriceSnapshot(value: unknown): value is { totalWithoutDiscountsCentsCustomer: number } {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { totalWithoutDiscountsCentsCustomer?: unknown }).totalWithoutDiscountsCentsCustomer === 'number'
    );
}
