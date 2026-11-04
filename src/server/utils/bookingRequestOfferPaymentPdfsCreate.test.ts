import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, featureToggleUserOverrides } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestOfferPaymentPdfsCreate } from './bookingRequestOfferPaymentPdfsCreate';
import { fileUploadReferencedByBookingRequestOfferPaymentPdf } from './fileUploadContentAccess';

const invoiceAddress = {
    companyName: '',
    firstName: 'Ada',
    lastName: 'Lovelace',
    country: 'DE',
    city: 'Berlin',
    postalCode: '10115',
    line1: 'Musterstraße 1',
    line2: '',
};

async function insertPaidOffer() {
    const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Lovelace' });
    const cook = await commandSetup.withUser({ firstName: 'Marie', lastName: 'Curie' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId, isVisible: true, isApprovedByAdmin: true });
    const bookingRequestId = idCreate();
    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Geburtstag',
        dateTime: new Date('2026-06-20T17:00:00.000Z'),
        exactEventAddress: {
            displayText: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            addressLine1: 'Street 1',
            addressLine2: '',
            city: 'Berlin',
            postCode: '10115',
            state: '',
            country: 'DE',
        },
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        invoiceAddress,
    });
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: true,
        userAccepted: true,
        menuPriceCents: 20_000,
        travelExpensesCents: 2_500,
        paymentProviderFeeCents: 500,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 3_600,
        platformFeeCentsCustomer: 800,
        payoutCentsCook: 18_900,
        totalWithoutDiscountsCentsCustomer: 23_800,
        totalCentsCustomer: 23_800,
        paymentStatus: 'PAYED',
        paymentDateTime: new Date('2026-06-01T16:00:00.000Z'),
    });
    return { customer, cook, bookingRequestOfferId, serverRuntime: customer.serverRuntime };
}

describe('bookingRequestOfferPaymentPdfsCreate', () => {
    it('captures both PDFs when the toggle is on', async () => {
        const { bookingRequestOfferId, serverRuntime, customer, cook } = await insertPaidOffer();
        await testDb.insert(featureToggleUserOverrides).values([
            { userId: customer.user.userId, featureToggleKey: 'BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS', enabled: true },
            { userId: cook.user.userId, featureToggleKey: 'BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS', enabled: true },
        ]);
        vi.mocked(serverRuntime.browser.capturePdf).mockResolvedValue(Buffer.from('%PDF-1'));

        const pdfs = await bookingRequestOfferPaymentPdfsCreate(bookingRequestOfferId, serverRuntime);

        expect(pdfs.customerReceipt?.fileUploadId).toBeTruthy();
        expect(pdfs.cookStatement?.fileUploadId).toBeTruthy();
        expect(serverRuntime.browser.capturePdf).toHaveBeenCalledTimes(2);
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);
        expect(offer?.customerReceiptFileUploadId).toBe(pdfs.customerReceipt?.fileUploadId);
        expect(offer?.cookStatementFileUploadId).toBe(pdfs.cookStatement?.fileUploadId);
        expect(await fileUploadReferencedByBookingRequestOfferPaymentPdf(testDb, pdfs.customerReceipt!.fileUploadId)).toBe(true);
    });

    it('skips capture when the toggle is off', async () => {
        const { bookingRequestOfferId, serverRuntime } = await insertPaidOffer();
        vi.mocked(serverRuntime.browser.capturePdf).mockClear();

        const pdfs = await bookingRequestOfferPaymentPdfsCreate(bookingRequestOfferId, serverRuntime);

        expect(pdfs.customerReceipt).toBeNull();
        expect(pdfs.cookStatement).toBeNull();
        expect(serverRuntime.browser.capturePdf).not.toHaveBeenCalled();
    });
});
