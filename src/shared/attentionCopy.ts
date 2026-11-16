import { t } from '../i18n/t';
import { formatBookingCallWhen, formatBookingWhenJoined } from './formatBookingWhen';
import { formatDate, formatTime } from './formatDate';
import type { Locale } from './locale';
import type { StatusTone } from './statusTone';

// Wording for server-derived attention (`User.attention`, `Cook.attention`,
// `Cook.onboardingSteps`). The server decides *what* applies; this module only
// says it. Routes and layout stay on each platform. See docs/architecture/attention.md.

export type UserAttentionKind =
    | 'OFFERS_TO_REVIEW'
    | 'PAYMENT_DUE'
    | 'OFFER_CHAT_UNREAD'
    | 'CALL_RESPONSE_NEEDED'
    | 'CALL_PENDING'
    | 'CALL_CONFIRMED'
    | 'TESTIMONIAL_MISSING'
    | 'KITCHEN_DETAILS_MISSING';

export type CookAttentionKind = 'APPROVAL_PENDING' | 'WALLET_RESET' | 'DIRECT_BOOKING_REQUEST' | 'OFFER_CHAT_UNREAD' | 'CALL_UPCOMING';

export type CookOnboardingStep =
    'WALLET' | 'TRAVEL' | 'PROFILE_PICTURE' | 'CHEF_PROFILE' | 'FIRST_MEAL' | 'FIRST_MENU' | 'DEFAULT_OFFER_MESSAGE' | 'FIRST_OFFER';

export type AttentionCopy = {
    title: string;
    body: string;
    actionLabel: string;
};

/** `actionLabel` is null when there is nothing to click (waiting for admin approval). */
type CookAttentionCopy = Omit<AttentionCopy, 'actionLabel'> & { actionLabel: string | null };

type AttentionTone = Extract<StatusTone, 'info' | 'warning'>;

function offerChatUnreadCopy(count: number, locale: Locale): AttentionCopy {
    return {
        title: t(locale, 'common', 'attention.offerChatUnread.title', { count }),
        body: t(locale, 'common', 'attention.offerChatUnread.body'),
        actionLabel: t(locale, 'common', 'attention.offerChatUnread.action'),
    };
}

export function userAttentionKindTone(kind: UserAttentionKind): AttentionTone {
    switch (kind) {
        case 'OFFERS_TO_REVIEW':
        case 'PAYMENT_DUE':
        case 'OFFER_CHAT_UNREAD':
        case 'CALL_RESPONSE_NEEDED':
            return 'warning';
        case 'CALL_PENDING':
        case 'CALL_CONFIRMED':
        case 'TESTIMONIAL_MISSING':
        case 'KITCHEN_DETAILS_MISSING':
            return 'info';
    }
}

/** Short label when an item is folded into a booking-request card. */
export function userAttentionKindBadgeLabel(kind: UserAttentionKind, locale: Locale): string {
    switch (kind) {
        case 'OFFERS_TO_REVIEW':
            return t(locale, 'profileCustomer', 'attention.user.badge.OFFERS_TO_REVIEW');
        case 'PAYMENT_DUE':
            return t(locale, 'profileCustomer', 'attention.user.badge.PAYMENT_DUE');
        case 'OFFER_CHAT_UNREAD':
            return t(locale, 'profileCustomer', 'attention.user.badge.OFFER_CHAT_UNREAD');
        case 'CALL_RESPONSE_NEEDED':
        case 'CALL_PENDING':
        case 'CALL_CONFIRMED':
            return t(locale, 'profileCustomer', 'attention.user.badge.CALL');
        case 'TESTIMONIAL_MISSING':
            return t(locale, 'profileCustomer', 'attention.user.badge.TESTIMONIAL_MISSING');
        case 'KITCHEN_DETAILS_MISSING':
            return t(locale, 'profileCustomer', 'attention.user.badge.KITCHEN_DETAILS_MISSING');
    }
}

export function userAttentionCopy(
    item: {
        kind: UserAttentionKind;
        count: number;
        occasion: string;
        callStartAt?: string | Date | null;
        callEndAt?: string | Date | null;
    },
    locale: Locale,
    timeZone: string,
): AttentionCopy {
    const when =
        item.callStartAt != null && item.callEndAt != null
            ? formatBookingWhenJoined(
                  formatBookingCallWhen({
                      startAt: item.callStartAt,
                      endAt: item.callEndAt,
                      locale,
                      viewerTimeZone: timeZone,
                  }),
              )
            : '';
    const upcomingCallTitle = t(locale, 'profileCustomer', 'attention.user.upcomingCall.title');
    const openCall = t(locale, 'profileCustomer', 'attention.user.upcomingCall.action');

    switch (item.kind) {
        case 'OFFERS_TO_REVIEW':
            return {
                title: t(locale, 'profileCustomer', 'attention.user.OFFERS_TO_REVIEW.title', { count: item.count }),
                body: t(locale, 'profileCustomer', 'attention.user.OFFERS_TO_REVIEW.body'),
                actionLabel: t(locale, 'profileCustomer', 'attention.user.OFFERS_TO_REVIEW.action', { count: item.count }),
            };
        case 'PAYMENT_DUE':
            return {
                title: t(locale, 'profileCustomer', 'attention.user.PAYMENT_DUE.title'),
                body: t(locale, 'profileCustomer', 'attention.user.PAYMENT_DUE.body', { occasion: item.occasion }),
                actionLabel: t(locale, 'profileCustomer', 'attention.user.PAYMENT_DUE.action'),
            };
        case 'OFFER_CHAT_UNREAD':
            return offerChatUnreadCopy(item.count, locale);
        case 'CALL_RESPONSE_NEEDED':
            return {
                title: t(locale, 'profileCustomer', 'attention.user.CALL_RESPONSE_NEEDED.title'),
                body: t(locale, 'profileCustomer', 'attention.user.CALL_RESPONSE_NEEDED.body', { when }),
                actionLabel: openCall,
            };
        case 'CALL_PENDING':
            return {
                title: upcomingCallTitle,
                body: t(locale, 'profileCustomer', 'attention.user.CALL_PENDING.body', { when }),
                actionLabel: openCall,
            };
        case 'CALL_CONFIRMED':
            return {
                title: upcomingCallTitle,
                body: t(locale, 'profileCustomer', 'attention.user.CALL_CONFIRMED.body', { when }),
                actionLabel: openCall,
            };
        case 'TESTIMONIAL_MISSING':
            return {
                title: t(locale, 'profileCustomer', 'attention.user.TESTIMONIAL_MISSING.title'),
                body: t(locale, 'profileCustomer', 'attention.user.TESTIMONIAL_MISSING.body', { occasion: item.occasion }),
                actionLabel: t(locale, 'profileCustomer', 'attention.user.TESTIMONIAL_MISSING.action'),
            };
        case 'KITCHEN_DETAILS_MISSING':
            return {
                title: t(locale, 'profileCustomer', 'attention.user.KITCHEN_DETAILS_MISSING.title'),
                body: t(locale, 'profileCustomer', 'attention.user.KITCHEN_DETAILS_MISSING.body', { occasion: item.occasion }),
                actionLabel: t(locale, 'profileCustomer', 'attention.user.KITCHEN_DETAILS_MISSING.action'),
            };
    }
}

export function cookAttentionKindTone(kind: CookAttentionKind): AttentionTone {
    switch (kind) {
        case 'WALLET_RESET':
        case 'OFFER_CHAT_UNREAD':
        case 'DIRECT_BOOKING_REQUEST':
            return 'warning';
        case 'APPROVAL_PENDING':
        case 'CALL_UPCOMING':
            return 'info';
    }
}

export function cookAttentionCopy(
    item: { kind: CookAttentionKind; count: number; callStartAt?: string | Date | null; customerDisplay?: string | null },
    locale: Locale,
    timeZone: string,
): CookAttentionCopy {
    switch (item.kind) {
        case 'APPROVAL_PENDING':
            return {
                title: t(locale, 'profileCook', 'attention.cook.APPROVAL_PENDING.title'),
                body: t(locale, 'profileCook', 'attention.cook.APPROVAL_PENDING.body'),
                actionLabel: null,
            };
        case 'WALLET_RESET':
            return {
                title: t(locale, 'profileCook', 'attention.cook.WALLET_RESET.title'),
                body: t(locale, 'profileCook', 'attention.cook.WALLET_RESET.body'),
                actionLabel: t(locale, 'profileCook', 'attention.cook.WALLET_RESET.action'),
            };
        case 'DIRECT_BOOKING_REQUEST':
            return {
                title: t(locale, 'profileCook', 'attention.cook.DIRECT_BOOKING_REQUEST.title', { count: item.count }),
                body: t(locale, 'profileCook', 'attention.cook.DIRECT_BOOKING_REQUEST.body'),
                actionLabel: t(locale, 'profileCook', 'attention.cook.DIRECT_BOOKING_REQUEST.action'),
            };
        case 'OFFER_CHAT_UNREAD':
            return offerChatUnreadCopy(item.count, locale);
        case 'CALL_UPCOMING': {
            const date = formatDate(item.callStartAt, { locale, timeZone, weekday: true, dateStyle: 'medium' });
            const time = formatTime(item.callStartAt, { locale, timeZone });
            const when = t(locale, 'common', 'bookingWhen.withTimeSuffix', { value: `${date} · ${time}` });
            return {
                title: t(locale, 'profileCook', 'attention.cook.CALL_UPCOMING.title'),
                body: t(locale, 'profileCook', 'attention.cook.CALL_UPCOMING.body', { who: item.customerDisplay ?? '', when }),
                actionLabel: t(locale, 'profileCook', 'attention.cook.CALL_UPCOMING.action'),
            };
        }
    }
}

export function cookOnboardingStepCopy(step: CookOnboardingStep, locale: Locale): AttentionCopy {
    return {
        title: t(locale, 'profileCook', `attention.onboarding.${step}.title`),
        body: t(locale, 'profileCook', `attention.onboarding.${step}.body`),
        actionLabel: t(locale, 'profileCook', `attention.onboarding.${step}.action`),
    };
}
