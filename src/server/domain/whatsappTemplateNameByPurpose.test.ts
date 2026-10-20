import { describe, expect, it } from 'vitest';

import { whatsappTemplateNameByPurpose } from './whatsapp';

describe('whatsappTemplateNameByPurpose', () => {
    it('uses Meta-approved template names', () => {
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_CREATED).toBe('user_booking_request_create__for_user');
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_COOK_NOTIFY).toBe('user_booking_request_create__for_cook');
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_UPDATED_COOK).toBe('user_booking_request_update__for_cook');
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_OFFER_CREATED).toBe('cook_booking_request_offer_create__for_user');
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_OFFER_MENU_UPDATED).toBe(
            'cook_menu_courses_update_with_relation_to_offer__for_user',
        );
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_OFFER_ACCEPTED_COOK).toBe('user_booking_request_offer_accept__for_cook');
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_OFFER_CHAT_UNREAD_CUSTOMER).toBe(
            'cook_booking_request_offer_unread_notifications',
        );
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_OFFER_CHAT_UNREAD_COOK).toBe(
            'user_booking_request_offer_unread_notifications',
        );
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_REACTION_REMINDER).toBe('user_booking_request_reaction_reminder');
        expect(whatsappTemplateNameByPurpose.CALL_SLOT_BOOKING_CREATE).toBe('call_slot_booking_create');
        expect(whatsappTemplateNameByPurpose.CALL_SLOT_BOOKING_CONFIRM).toBe('call_slot_booking_confirm');
        expect(whatsappTemplateNameByPurpose.CALL_SLOT_BOOKING_CANCEL).toBe('call_slot_booking_cancel');
        expect(whatsappTemplateNameByPurpose.CALL_SLOT_BOOKING_REMINDER).toBe('call_slot_booking_reminder_60_min_before');
    });

    it('leaves purposes without a Meta template as null', () => {
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_OFFER_ACCEPTED).toBeNull();
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED).toBeNull();
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT).toBeNull();
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_CANCELED).toBeNull();
        expect(whatsappTemplateNameByPurpose.BOOKING_REQUEST_CANCELED_COOK).toBeNull();
    });
});
