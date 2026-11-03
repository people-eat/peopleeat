import { describe, expect, it } from 'vitest';

import {
    notificationEmailAllowed,
    notificationSettingsMerge,
    notificationSettingsResolve,
    notificationWhatsAppAllowed,
} from './notificationSettings';

const allOff = notificationSettingsResolve(null);
for (const domain of Object.keys(allOff) as (keyof typeof allOff)[]) {
    allOff[domain] = { email: false, whatsApp: false };
}

describe('notificationSettings', () => {
    it('treats a missing column as every channel on', () => {
        const resolved = notificationSettingsResolve(null);
        expect(resolved.customerBooking).toEqual({ email: true, whatsApp: true });
        expect(resolved.cookNewRequest.whatsApp).toBe(true);
        expect(notificationEmailAllowed(null, 'BOOKING_REQUEST_CREATED')).toBe(true);
        expect(notificationWhatsAppAllowed(undefined, 'BOOKING_REQUEST_COOK_NOTIFY')).toBe(true);
    });

    it('blocks only the channel that was turned off', () => {
        const stored = notificationSettingsMerge(null, {
            customerBooking: { email: false, whatsApp: true },
            cookChat: { email: true, whatsApp: false },
        });
        expect(notificationEmailAllowed(stored, 'BOOKING_REQUEST_CREATED')).toBe(false);
        expect(notificationWhatsAppAllowed(stored, 'BOOKING_REQUEST_CREATED')).toBe(true);
        expect(notificationEmailAllowed(stored, 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK')).toBe(true);
        expect(notificationWhatsAppAllowed(stored, 'BOOKING_REQUEST_OFFER_CHAT_UNREAD_COOK')).toBe(false);
        expect(notificationEmailAllowed(stored, 'BOOKING_REQUEST_COOK_NOTIFY')).toBe(true);
    });

    it('keeps security, payment, support, approval, and concierge mail on when every optional channel is off', () => {
        expect(notificationEmailAllowed(allOff, 'AUTH_EMAIL_OTP')).toBe(true);
        expect(notificationEmailAllowed(allOff, 'EMAIL_ADDRESS_UPDATE_CONFIRM')).toBe(true);
        expect(notificationEmailAllowed(allOff, 'ACCOUNT_DELETE_CONFIRM')).toBe(true);
        expect(notificationEmailAllowed(allOff, 'GIFT_CARD_PURCHASED')).toBe(true);
        expect(notificationEmailAllowed(allOff, 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED')).toBe(true);
        expect(notificationEmailAllowed(allOff, 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT')).toBe(true);
        expect(notificationEmailAllowed(allOff, 'SUPPORT_REQUEST_MESSAGE_FROM_ADMIN')).toBe(true);
        expect(notificationEmailAllowed(allOff, 'COOK_APPROVED_BY_ADMIN')).toBe(true);
        expect(notificationWhatsAppAllowed(allOff, 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED')).toBe(true);
        expect(notificationWhatsAppAllowed(allOff, 'CONCIERGE_SESSION_REPLY')).toBe(true);
    });

    it('uses the audience for shared call-slot and cancellation purposes', () => {
        const stored = notificationSettingsMerge(null, {
            customerBooking: { email: false, whatsApp: true },
            cookOffer: { email: true, whatsApp: false },
        });
        expect(notificationEmailAllowed(stored, 'CALL_SLOT_BOOKING_REMINDER', 'CUSTOMER')).toBe(false);
        expect(notificationEmailAllowed(stored, 'CALL_SLOT_BOOKING_REMINDER', 'COOK')).toBe(true);
        expect(notificationWhatsAppAllowed(stored, 'CALL_SLOT_BOOKING_CREATE', 'CUSTOMER')).toBe(true);
        expect(notificationWhatsAppAllowed(stored, 'CALL_SLOT_BOOKING_CREATE', 'COOK')).toBe(false);
        expect(notificationEmailAllowed(stored, 'BOOKING_REQUEST_CANCELED', 'CUSTOMER')).toBe(false);
        expect(notificationEmailAllowed(stored, 'BOOKING_REQUEST_CANCELED', 'COOK')).toBe(true);
        expect(() => notificationEmailAllowed(stored, 'BOOKING_REQUEST_CANCELED')).toThrow(/requires an audience/);
        expect(() => notificationWhatsAppAllowed(stored, 'CALL_SLOT_BOOKING_REMINDER')).toThrow(/requires an audience/);
    });

    it('merges one domain and leaves the others on', () => {
        const stored = notificationSettingsMerge(null, {
            customerReview: { email: false, whatsApp: false },
        });
        expect(stored.customerReview).toEqual({ email: false, whatsApp: false });
        expect(stored.customerBooking).toEqual({ email: true, whatsApp: true });
        const again = notificationSettingsMerge(stored, {
            customerReview: { email: false, whatsApp: true },
        });
        expect(again.customerReview).toEqual({ email: false, whatsApp: true });
    });
});
