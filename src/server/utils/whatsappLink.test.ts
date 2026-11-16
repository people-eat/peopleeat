import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOffers,
    bookingRequests,
    cookCallSlotBookings,
    cooks,
    outboundWhatsAppMessages,
    whatsAppConversations,
    whatsAppMessages,
} from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { bookingRequestOfferCallSlotCancelWhatsAppSend } from './bookingRequestOfferCallSlotWhatsApp';
import { whatsappLinkPathAssert, whatsappLinkPathFind, whatsappLinkResponseCreate } from './whatsappLink';

const browserAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
async function sentLinkSeed() {
    const phone = phoneNumberCreate();
    const { serverRuntime, user } = await commandSetup.withUser({ phoneNumber: phone });
    const auditId = idCreate(),
        conversationId = idCreate(),
        messageId = idCreate();
    const path = `/en/profile/booking-requests/${idCreate()}/offers/${idCreate()}?tab=chat`;
    await testDb
        .insert(whatsAppConversations)
        .values({ whatsAppConversationId: conversationId, lastMessageAt: new Date(), phoneNumber: phone, userId: user.userId });
    await testDb.insert(outboundWhatsAppMessages).values({
        outboundWhatsAppMessageId: auditId,
        provider: 'console',
        purpose: 'BOOKING_REQUEST_OFFER_CHAT_UNREAD_CUSTOMER',
        toPhoneNumber: phone,
        locale: 'en',
        bodySnapshot: 'message',
        linkPath: path,
        sentAt: new Date(),
    });
    await testDb.insert(whatsAppMessages).values({
        whatsAppMessageId: messageId,
        whatsAppConversationId: conversationId,
        direction: 'OUTBOUND',
        messageKind: 'TEMPLATE',
        body: 'message',
        outboundWhatsAppMessageId: auditId,
    });
    return { serverRuntime, auditId, messageId, path };
}

describe('WhatsApp deep links', () => {
    it.each([
        'https://evil.example/',
        '//evil.example/',
        '/profile/../admin',
        `/profile/booking-requests/${encodeURIComponent('//evil.example')}`,
        '/en/profile?returnTo=https://evil.example',
    ])('rejects unsafe destination %s', (path) => {
        // Arrange — nothing
        // Act
        const act = () => whatsappLinkPathAssert(path);
        // Assert
        expect(act).toThrow('Invalid WhatsApp link destination');
    });

    it('redirects to the exact localized tab and preserves the first click on audit and transcript', async () => {
        // Arrange
        const { serverRuntime, auditId, messageId, path } = await sentLinkSeed();
        const request = new Request(`https://people-eat.com/api/whatsapp/links/${auditId}`, { headers: { 'user-agent': browserAgent } });
        // Act
        const first = await whatsappLinkResponseCreate(serverRuntime, auditId, request);
        const [audit1] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, auditId));
        await whatsappLinkResponseCreate(serverRuntime, auditId, request);
        const [audit2] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, auditId));
        const [message] = await testDb.select().from(whatsAppMessages).where(eq(whatsAppMessages.whatsAppMessageId, messageId));
        // Assert
        expect(first.status).toBe(302);
        expect(first.headers.get('location')).toBe(path);
        expect(first.headers.get('cache-control')).toBe('no-store');
        expect(first.headers.get('referrer-policy')).toBe('no-referrer');
        expect(audit1?.linkClickedAt).not.toBeNull();
        expect(audit2?.linkClickedAt).toEqual(audit1?.linkClickedAt);
        expect(message?.linkClickedAt).toEqual(audit1?.linkClickedAt);
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(2);
    });

    it.each([
        { method: 'HEAD', agent: browserAgent, purpose: '' },
        { method: 'GET', agent: 'facebookexternalhit/1.1', purpose: '' },
        { method: 'GET', agent: browserAgent, purpose: 'prefetch' },
    ])('does not count preview/HEAD requests ($method, $agent, $purpose)', async ({ method, agent, purpose }) => {
        // Arrange
        const { serverRuntime, auditId } = await sentLinkSeed();
        const request = new Request(`https://people-eat.com/api/whatsapp/links/${auditId}`, {
            method,
            headers: { 'user-agent': agent, purpose },
        });
        // Act
        const response = await whatsappLinkResponseCreate(serverRuntime, auditId, request);
        const [audit] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, auditId));
        // Assert
        expect(response.status).toBe(302);
        expect(audit?.linkClickedAt).toBeNull();
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('returns 404 for unknown, invalid and unsent links', async () => {
        // Arrange
        const { serverRuntime, auditId } = await sentLinkSeed();
        await testDb
            .update(outboundWhatsAppMessages)
            .set({ sentAt: null })
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, auditId));
        const request = new Request('https://people-eat.com/api/whatsapp/links/unknown');
        // Act
        const statuses = await Promise.all(
            [auditId, idCreate(), 'invalid'].map(async (token) => (await whatsappLinkResponseCreate(serverRuntime, token, request)).status),
        );
        // Assert
        expect(statuses).toEqual([404, 404, 404]);
    });

    it('resolves customer and cook chat/call/review destinations from the booking context', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ phoneNumber: phoneNumberCreate() });
        const cook = await commandSetup.withUser({ phoneNumber: phoneNumberCreate() });
        const address = {
            displayText: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            addressLine1: 'Street 1',
            addressLine2: '',
            city: 'Berlin',
            postCode: '10115',
            state: 'BE',
            country: 'DE',
        };
        await testDb.insert(cooks).values({
            cookId: cook.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: address,
            travelExpensesAmount: 25,
            maximumTravelDistance: 100,
        });
        const requestId = idCreate(),
            offerId = idCreate(),
            callId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: requestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(),
            exactEventAddress: address,
            priceClassType: 'MEDIUM',
            originalMessage: 'Dinner',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: offerId,
            bookingRequestId: requestId,
            cookId: cook.user.userId,
            menuPriceCents: 20000,
            travelExpensesCents: 2500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 0,
            platformFeeCentsCook: 3600,
            platformFeeCentsCustomer: 0,
            payoutCentsCook: 18400,
            totalWithoutDiscountsCentsCustomer: 23000,
        });
        await testDb.insert(cookCallSlotBookings).values({
            cookCallSlotBookingId: callId,
            cookId: cook.user.userId,
            userId: customer.user.userId,
            bookingRequestOfferId: offerId,
            startAt: new Date(),
            endAt: new Date(Date.now() + 1800000),
            initiator: 'CUSTOMER',
        });
        const runtime = customer.serverRuntime;
        // Act
        const customerChat = await whatsappLinkPathFind(runtime, {
            purpose: 'BOOKING_REQUEST_OFFER_CHAT_UNREAD_CUSTOMER',
            locale: 'en',
            userId: customer.user.userId,
            relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: offerId },
        });
        const cookCall = await whatsappLinkPathFind(runtime, {
            purpose: 'CALL_SLOT_BOOKING_REMINDER',
            locale: 'de',
            userId: cook.user.userId,
            relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: callId },
        });
        const customerReview = await whatsappLinkPathFind(runtime, {
            purpose: 'TESTIMONIAL_REMINDER_MORNING_CUSTOMER',
            locale: 'de',
            userId: customer.user.userId,
            relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: offerId },
        });
        const foreign = whatsappLinkPathFind(runtime, {
            purpose: 'BOOKING_REQUEST_OFFER_CREATED',
            locale: 'en',
            userId: idCreate(),
            relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: offerId },
        });
        // Assert
        expect(customerChat).toBe(`/en/profile/booking-requests/${requestId}/offers/${offerId}?tab=chat`);
        expect(cookCall).toBe(`/profile/booking-request-offers/${offerId}?tab=call`);
        expect(customerReview).toBe(`/profile/booking-requests/${requestId}/offers/${offerId}?tab=testimonial`);
        await expect(foreign).rejects.toThrow('does not belong');
        const frenchOffer = await whatsappLinkPathFind(runtime, {
            purpose: 'BOOKING_REQUEST_OFFER_CREATED',
            locale: 'fr',
            userId: customer.user.userId,
            relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: offerId },
        });
        expect(frenchOffer).toBe(`/fr/profile/booking-requests/${requestId}/offers/${offerId}?tab=offer`);
        await testDb.update(cookCallSlotBookings).set({ status: 'DECLINED' }).where(eq(cookCallSlotBookings.cookCallSlotBookingId, callId));
        await bookingRequestOfferCallSlotCancelWhatsAppSend(runtime, {
            cookCallSlotBookingId: callId,
            recipient: 'CUSTOMER',
            reason: 'Unavailable',
        });
        expect(runtime.whatsapp.sendTemplate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                purpose: 'CALL_SLOT_BOOKING_DECLINE',
                bodyParameters: [customer.user.firstName, cook.user.firstName, 'Unavailable'],
            }),
        );
        await testDb.update(cookCallSlotBookings).set({ status: 'CANCELED' }).where(eq(cookCallSlotBookings.cookCallSlotBookingId, callId));
        await bookingRequestOfferCallSlotCancelWhatsAppSend(runtime, {
            cookCallSlotBookingId: callId,
            recipient: 'CUSTOMER',
            reason: 'Schedule changed',
        });
        expect(runtime.whatsapp.sendTemplate).toHaveBeenLastCalledWith(expect.objectContaining({ purpose: 'CALL_SLOT_BOOKING_CANCEL' }));
    });
});
