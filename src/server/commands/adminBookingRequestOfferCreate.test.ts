import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferCreate } from './adminBookingRequestOfferCreate';

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

const priceInputs = {
    menuPriceCents: 25_000,
    travelExpensesCents: 2_000,
};

async function setupAdminOfferCreate() {
    const admin = await commandSetup.withUser({ firstName: 'offer-admin', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });

    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'AdminOffer' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        adjustedMessage: 'Adjusted for cooks',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });

    return { admin, cook, customer, bookingRequestId };
}

describe('adminBookingRequestOfferCreate', () => {
    it('creates an offer with derived fees, seeds chat, and notifies the customer when requested', async () => {
        const { admin, cook, customer, bookingRequestId } = await setupAdminOfferCreate();
        const expectedPrice = bookingRequestOfferPriceCalculate(priceInputs);

        const result = await adminBookingRequestOfferCreate(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    bookingRequestId,
                    cookId: cook.user.userId,
                    cookAccepted: true,
                    userAccepted: null,
                    ...priceInputs,
                    travelDistanceKm: 12.5,
                    notifyCustomer: true,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, result.referenceId!));
        expect(offer?.menuPriceCents).toBe(expectedPrice.menuPriceCents);
        expect(offer?.travelExpensesCents).toBe(expectedPrice.travelExpensesCents);
        expect(offer?.platformFeePercentCook).toBe(18);
        expect(offer?.platformFeePercentCustomer).toBe(4);
        expect(offer?.platformFeeCentsCook).toBe(expectedPrice.platformFeeCentsCook);
        expect(offer?.platformFeeCentsCustomer).toBe(expectedPrice.platformFeeCentsCustomer);
        expect(offer?.payoutCentsCook).toBe(expectedPrice.payoutCentsCook);
        expect(offer?.totalWithoutDiscountsCentsCustomer).toBe(expectedPrice.totalWithoutDiscountsCentsCustomer);
        expect(offer?.cookAccepted).toBe(true);
        expect(offer?.userAccepted).toBeNull();
        expect(offer?.paymentStatus).toBe('EMPTY');
        expect(offer?.userUnreadNotificationCount).toBe(1);
        expect(offer?.travelDistanceKm).toBe(12.5);

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, result.referenceId!))
            .orderBy(asc(bookingRequestOfferEvents.createdAt));
        expect(events.map((event) => event.type)).toEqual(['USER_MESSAGE_SIMPLE', 'COOK_CREATED']);
        expect((events[0]?.payload as { messageBody?: string }).messageBody).toBe('Adjusted for cooks');

        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('marks dual-accepted creates as PAYED_OUT_OF_SYSTEM without customer unread', async () => {
        const { admin, cook, bookingRequestId } = await setupAdminOfferCreate();

        const result = await adminBookingRequestOfferCreate(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    bookingRequestId,
                    cookId: cook.user.userId,
                    cookAccepted: true,
                    userAccepted: true,
                    ...priceInputs,
                    notifyCustomer: false,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, result.referenceId!));
        expect(offer?.paymentStatus).toBe('PAYED_OUT_OF_SYSTEM');
        expect(offer?.userUnreadNotificationCount).toBe(0);
    });

    it('rejects a duplicate offer for the same cook', async () => {
        const { admin, cook, bookingRequestId } = await setupAdminOfferCreate();

        await adminBookingRequestOfferCreate(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    bookingRequestId,
                    cookId: cook.user.userId,
                    cookAccepted: true,
                    ...priceInputs,
                    notifyCustomer: false,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        await expect(
            adminBookingRequestOfferCreate(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        bookingRequestId,
                        cookId: cook.user.userId,
                        cookAccepted: true,
                        ...priceInputs,
                        notifyCustomer: false,
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/offer already exists/);
    });

    it('seeds an optional cook message after COOK_CREATED', async () => {
        const { admin, cook, bookingRequestId } = await setupAdminOfferCreate();

        const result = await adminBookingRequestOfferCreate(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    bookingRequestId,
                    cookId: cook.user.userId,
                    cookAccepted: true,
                    ...priceInputs,
                    notifyCustomer: false,
                    message: '  Hello from ops  ',
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, result.referenceId!))
            .orderBy(asc(bookingRequestOfferEvents.createdAt));
        expect(events.map((event) => event.type)).toEqual(['USER_MESSAGE_SIMPLE', 'COOK_CREATED', 'COOK_MESSAGE_SIMPLE']);
        expect(events[2]!.payload).toEqual({ messageBody: 'Hello from ops' });
    });

    it('rejects offer create when the cook message contains a phone number', async () => {
        const { admin, cook, bookingRequestId } = await setupAdminOfferCreate();

        await expect(
            adminBookingRequestOfferCreate(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        bookingRequestId,
                        cookId: cook.user.userId,
                        cookAccepted: true,
                        ...priceInputs,
                        notifyCustomer: false,
                        message: 'Reach me on 0151 12345678',
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/phone numbers are not allowed/);
    });
});
