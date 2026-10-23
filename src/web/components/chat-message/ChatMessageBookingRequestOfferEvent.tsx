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
    PhoneIcon,
    SlidersHorizontalIcon,
    UsersIcon,
    UtensilsIcon,
} from 'lucide-react';

import { bookingRequestOfferPriceCalculate, formatCurrency, formatDate, formatTime } from '../../../shared';
import type { GqlCChatMessageBookingRequestOfferEvent, GqlCChatMessageBookingRequestOfferEventType } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { cn } from '../../utils/cn';
import type { StatusTone } from '../base/status';
import { statusBadgeToneClass, statusIconToneClass } from '../base/status';
import { MessageRow, Timestamp } from './shared';

/** Compact centered milestone pill for a booking-request offer domain event. */
export function ChatMessageBookingRequestOfferEventView({ message }: { message: GqlCChatMessageBookingRequestOfferEvent }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const label = chatMessageBookingRequestOfferEventLabel(message.type, locale);
    const detail = chatMessageBookingRequestOfferEventDetail(message, locale, timeZone);
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
            return 'success';
        case 'COOK_DECLINED':
        case 'USER_DECLINED':
        case 'USER_CANCELLED':
        case 'ADMIN_HANDED_OVER_CLOSED':
        case 'COOK_CALL_SLOT_DECLINED':
        case 'USER_CALL_SLOT_DECLINED':
        case 'COOK_CALL_SLOT_CANCELLED':
        case 'USER_CALL_SLOT_CANCELLED':
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
            return BanknoteIcon;
        case 'COOK_UPDATED_SUGGESTED_MENU':
        case 'USER_REQUESTED_MENU_CHANGES':
        case 'USER_CONFIGURED_MENU':
            return UtensilsIcon;
        case 'USER_CALL_SLOT_REQUESTED':
        case 'COOK_CALL_SLOT_REQUESTED':
            return PhoneIcon;
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

function chatMessageBookingRequestOfferEventLabel(type: GqlCChatMessageBookingRequestOfferEventType, locale: 'de' | 'en'): string {
    return (
        {
            COOK_CREATED: { de: 'Angebot erstellt', en: 'Offer created' },
            COOK_UPDATED_SUGGESTED_MENU: { de: 'Vorgeschlagene Menüs aktualisiert', en: 'Suggested menus updated' },
            USER_REQUESTED_MENU_CHANGES: { de: 'Menüänderungen angefragt', en: 'Menu changes requested' },
            USER_CONFIGURED_MENU: { de: 'Menü konfiguriert', en: 'Menu configured' },
            COOK_ACCEPTED: { de: 'Koch hat akzeptiert', en: 'Cook accepted' },
            COOK_DECLINED: { de: 'Koch hat abgelehnt', en: 'Cook declined' },
            USER_ACCEPTED: { de: 'Gast hat akzeptiert', en: 'Guest accepted' },
            USER_DECLINED: { de: 'Gast hat abgelehnt', en: 'Guest declined' },
            USER_CANCELLED: { de: 'Anfrage storniert', en: 'Request cancelled' },
            ADMIN_HANDED_OVER_CLOSED: { de: 'Von Concierge geschlossen', en: 'Closed by concierge' },
            ADMIN_HANDED_OVER_TO_COOK: { de: 'Von Concierge übergeben', en: 'Handed over by concierge' },
            USER_PARTICIPANTS_UPDATED: { de: 'Teilnehmer aktualisiert', en: 'Participants updated' },
            USER_PARTICIPANT_AMENDMENT_REQUESTED: {
                de: 'Buchungsänderung vorgeschlagen',
                en: 'Booking change proposed',
            },
            USER_PARTICIPANT_AMENDMENT_CANCELED: {
                de: 'Buchungsänderung zurückgezogen',
                en: 'Booking change withdrawn',
            },
            COOK_PARTICIPANT_AMENDMENT_ACCEPTED: {
                de: 'Buchungsänderung angenommen',
                en: 'Booking change accepted',
            },
            COOK_PARTICIPANT_AMENDMENT_DECLINED: {
                de: 'Buchungsänderung abgelehnt',
                en: 'Booking change declined',
            },
            ADMIN_PARTICIPANT_AMENDMENT_REQUESTED: {
                de: 'Concierge hat Buchungsänderung vorgeschlagen',
                en: 'Concierge proposed a booking change',
            },
            ADMIN_PARTICIPANT_AMENDMENT_APPLIED: {
                de: 'Concierge hat Buchungsänderung angewendet',
                en: 'Concierge applied a booking change',
            },
            COOK_PREPARATIONS_COMPLETED: { de: 'Einkauf / Vorbereitung erledigt', en: 'Shopping / preparations done' },
            ADMIN_PREPARATIONS_CLEARED: { de: 'Vorbereitungssperre aufgehoben', en: 'Preparations lock cleared' },
            USER_RESTRICTIONS_UPDATED: { de: 'Einschränkungen aktualisiert', en: 'Restrictions updated' },
            USER_DATE_UPDATED: { de: 'Datum aktualisiert', en: 'Date updated' },
            USER_TIME_UPDATED: { de: 'Uhrzeit aktualisiert', en: 'Time updated' },
            USER_PREFERENCES_UPDATED: { de: 'Präferenzen aktualisiert', en: 'Preferences updated' },
            USER_LOCATION_UPDATED: { de: 'Adresse aktualisiert', en: 'Location updated' },
            COOK_CHANGED_PRICE: { de: 'Preis geändert', en: 'Price changed' },
            SYSTEM_CHANGED_PRICE: { de: 'Preis automatisch angepasst', en: 'Price adjusted automatically' },
            USER_CALL_SLOT_REQUESTED: { de: 'Gesprächszeit angefragt', en: 'Call slot requested' },
            COOK_CALL_SLOT_REQUESTED: { de: 'Gesprächszeit angefragt', en: 'Call slot requested' },
            COOK_CALL_SLOT_CONFIRMED: { de: 'Gesprächszeit bestätigt', en: 'Call slot confirmed' },
            USER_CALL_SLOT_CONFIRMED: { de: 'Gesprächszeit bestätigt', en: 'Call slot confirmed' },
            COOK_CALL_SLOT_DECLINED: { de: 'Gesprächszeit abgelehnt', en: 'Call slot declined' },
            USER_CALL_SLOT_DECLINED: { de: 'Gesprächszeit abgelehnt', en: 'Call slot declined' },
            USER_CALL_SLOT_CANCELLED: { de: 'Gesprächszeit storniert', en: 'Call slot cancelled' },
            COOK_CALL_SLOT_CANCELLED: { de: 'Gesprächszeit storniert', en: 'Call slot cancelled' },
        } as const
    )[type][locale];
}

function chatMessageBookingRequestOfferEventDetail(
    message: GqlCChatMessageBookingRequestOfferEvent,
    locale: 'de' | 'en',
    timeZone: string,
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
            return {
                de: `Vorheriger Chat mit ${cookNameBefore} wurde übernommen`,
                en: `Prior chat with ${cookNameBefore} was copied`,
            }[locale];
        }
        return cookNameBefore;
    }
    if (typeof record.reason === 'string' && record.reason.trim().length > 0) {
        if (record.reason === 'ANOTHER_SLOT_CONFIRMED') {
            return { de: 'Ein anderer Termin wurde bestätigt.', en: 'Another slot was confirmed.' }[locale];
        }
        if (record.reason === 'HANDED_OVER') {
            return { de: 'An Angebot übergeben', en: 'Handed over to another offer' }[locale];
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
                    return `${datePart} · ${startTime}–${formatTime(end, { locale, timeZone })}`;
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
