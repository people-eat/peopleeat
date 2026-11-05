import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOffers, bookingRequests, cooks, featureToggleUserOverrides } from '../db/schema';
import type { BookingRequestOfferPaymentStatus } from '../domain/bookingRequest';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferPaymentDocumentsRegenerate } from './adminBookingRequestOfferPaymentDocumentsRegenerate';

const berlin = {
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

async function seedOffer(paymentStatus: BookingRequestOfferPaymentStatus) {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Guest' });
    const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Chef' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId });

    const bookingRequestId = idCreate();
    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: true,
        userAccepted: true,
        menuPriceCents: 25_000,
        travelExpensesCents: 2_000,
        paymentProviderFeeCents: 800,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 4_500,
        platformFeeCentsCustomer: 1_000,
        payoutCentsCook: 22_500,
        totalWithoutDiscountsCentsCustomer: 28_800,
        totalCentsCustomer: 28_800,
        paymentStatus,
        paymentDateTime:
            paymentStatus === 'PAYED' || paymentStatus === 'TRANSFERRED' || paymentStatus === 'PAYED_OUT_OF_SYSTEM'
                ? new Date('2026-06-01T16:00:00.000Z')
                : null,
    });

    return { customer, cook, bookingRequestOfferId };
}

async function setReceipts(userId: string, enabled: boolean): Promise<void> {
    await testDb.insert(featureToggleUserOverrides).values({
        userId,
        featureToggleKey: 'BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS',
        enabled,
    });
}

async function offerDocuments(bookingRequestOfferId: string) {
    const [row] = await testDb
        .select({
            paymentStatus: bookingRequestOffers.paymentStatus,
            customerReceiptFileUploadId: bookingRequestOffers.customerReceiptFileUploadId,
            cookStatementFileUploadId: bookingRequestOffers.cookStatementFileUploadId,
        })
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
        .limit(1);
    return row;
}

async function adminCaller() {
    const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    return admin;
}

describe('adminBookingRequestOfferPaymentDocumentsRegenerate', () => {
    it('returns false when the offer is missing', async () => {
        // Arrange
        const admin = await adminCaller();
        const bookingRequestOfferId = idCreate();

        // Act
        const result = await adminBookingRequestOfferPaymentDocumentsRegenerate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await offerDocuments(bookingRequestOfferId)).toBeUndefined();
        expect(admin.serverRuntime.browser.capturePdf).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('returns false when the offer is not paid', async () => {
        // Arrange
        const admin = await adminCaller();
        const { bookingRequestOfferId } = await seedOffer('EMPTY');
        const before = await offerDocuments(bookingRequestOfferId);

        // Act
        const result = await adminBookingRequestOfferPaymentDocumentsRegenerate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await offerDocuments(bookingRequestOfferId)).toEqual(before);
        expect(admin.serverRuntime.browser.capturePdf).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('returns false and publishes when payment receipts are off', async () => {
        // Arrange
        const admin = await adminCaller();
        const { customer, cook, bookingRequestOfferId } = await seedOffer('PAYED');
        await setReceipts(customer.user.userId, false);
        await setReceipts(cook.user.userId, false);
        const before = await offerDocuments(bookingRequestOfferId);

        // Act
        const result = await adminBookingRequestOfferPaymentDocumentsRegenerate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await offerDocuments(bookingRequestOfferId)).toEqual(before);
        expect(admin.serverRuntime.browser.capturePdf).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenNthCalledWith(1, { userId: customer.user.userId });
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenNthCalledWith(2, { userId: cook.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('regenerates both payment documents and publishes', async () => {
        // Arrange
        const admin = await adminCaller();
        const { customer, cook, bookingRequestOfferId } = await seedOffer('PAYED');
        await setReceipts(customer.user.userId, true);
        await setReceipts(cook.user.userId, true);
        vi.mocked(admin.serverRuntime.browser.capturePdf).mockResolvedValue(Buffer.from('%PDF-1'));
        const before = await offerDocuments(bookingRequestOfferId);

        // Act
        const result = await adminBookingRequestOfferPaymentDocumentsRegenerate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        const after = await offerDocuments(bookingRequestOfferId);
        expect(after?.customerReceiptFileUploadId).toEqual(expect.any(String));
        expect(after?.cookStatementFileUploadId).toEqual(expect.any(String));
        expect(after?.customerReceiptFileUploadId).not.toBe(before?.customerReceiptFileUploadId);
        expect(after?.cookStatementFileUploadId).not.toBe(before?.cookStatementFileUploadId);
        expect(after?.customerReceiptFileUploadId).not.toBe(after?.cookStatementFileUploadId);
        expect(after?.paymentStatus).toBe('PAYED');
        expect(admin.serverRuntime.browser.capturePdf).toHaveBeenCalledTimes(2);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenNthCalledWith(1, { userId: customer.user.userId });
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenNthCalledWith(2, { userId: cook.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });
});
