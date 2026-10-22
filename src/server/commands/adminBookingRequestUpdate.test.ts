import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks, featureToggles } from '../db/schema';
import { bookingRequestAdjustedMessageGenerate } from '../jobs/handlers/bookingRequestAdjustedMessageGenerate';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminBookingRequestUpdate } from './adminBookingRequestUpdate';

const sampleAddress = {
    displayText: 'Musterstraße 1, 80331 München',
    latitude: 48.137,
    longitude: 11.575,
    addressLine1: 'Musterstraße 1',
    addressLine2: '',
    city: 'München',
    postCode: '80331',
    state: 'BY',
    country: 'DE',
};

const berlinAddress = {
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

async function insertOfferWithCook(bookingRequestId: string, menuPriceCents = 20_000) {
    const cook = await commandSetup.withUser({ firstName: 'price-cook', lastName: 'Cook' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlinAddress,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
    });
    const offerId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId: offerId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: true,
        userAccepted: null,
        menuPriceCents,
        travelExpensesCents: 1_000,
        travelDistanceKm: 20,
        paymentProviderFeeCents: 400,
        platformFeePercentCook: 15,
        platformFeePercentCustomer: 10,
        platformFeeCentsCook: 3_000,
        platformFeeCentsCustomer: 2_140,
        payoutCentsCook: 18_000,
        totalWithoutDiscountsCentsCustomer: 23_540,
        paymentStatus: 'EMPTY',
        priceAutoAdjustReason: null,
    });
    return { cook, offerId };
}

async function setupAdminAndRequest() {
    const admin = await commandSetup.withUser({ firstName: 'booking-admin-update', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    const customer = await commandSetup.withUser({
        firstName: 'update-customer',
        lastName: 'Customer',
        phoneNumber: phoneNumberCreate(),
        birthDate: '1990-05-01',
        preferredCommunication: 'E_MAIL',
    });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date('2030-06-15T18:00:00.000Z'),
        exactEventAddress: sampleAddress,
        priceClassType: 'MEDIUM',
        originalMessage: 'Please cook for us.',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        expiresAt: new Date('2030-06-15T23:59:59.999Z'),
    });
    return { admin, customer, bookingRequestId };
}

describe('adminBookingRequestUpdate', () => {
    it('patches occasion, messages, price class, and address', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();

        const result = await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestId,
                input: {
                    occasion: 'Anniversary',
                    originalMessage: 'Updated message',
                    adjustedMessage: 'Cook-facing message',
                    priceClassType: 'HIGH',
                    exactEventAddress: {
                        ...sampleAddress,
                        city: 'Berlin',
                        displayText: 'Berlin',
                        latitude: 52.52,
                        longitude: 13.405,
                    },
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestId });

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.occasion).toBe('Anniversary');
        expect(row?.originalMessage).toBe('Updated message');
        expect(row?.adjustedMessage).toBe('Cook-facing message');
        expect(row?.priceClassType).toBe('HIGH');
        expect(row?.exactEventAddress.city).toBe('Berlin');
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('recomputes expiresAt when dateTime changes unless expiresAt is provided', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();
        const nextDateTime = new Date('2030-08-01T19:00:00.000Z');

        await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, input: { dateTime: nextDateTime } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [auto] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(auto?.dateTime.toISOString()).toBe(nextDateTime.toISOString());
        expect(auto?.expiresAt?.toISOString()).toBe('2030-08-01T23:59:59.999Z');

        const explicitExpiresAt = new Date('2030-09-01T12:00:00.000Z');
        await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestId,
                input: {
                    dateTime: new Date('2030-09-01T18:00:00.000Z'),
                    expiresAt: explicitExpiresAt,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [explicit] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(explicit?.expiresAt?.toISOString()).toBe(explicitExpiresAt.toISOString());
    });

    it('patches preferences and resets cook acceptance on open offers', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();
        const cook = await commandSetup.withUser({ firstName: 'prefs-cook', lastName: 'Cook' });
        await testDb.insert(cooks).values({
            cookId: cook.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: sampleAddress,
            travelExpensesAmount: 25,
            maximumTravelDistance: 100,
        });
        const offerId = idCreate();
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: offerId,
            bookingRequestId,
            cookId: cook.user.userId,
            cookAccepted: true,
            userAccepted: null,
            menuPriceCents: 20_000,
            travelExpensesCents: 1_000,
            paymentProviderFeeCents: 400,
            platformFeePercentCook: 15,
            platformFeePercentCustomer: 10,
            platformFeeCentsCook: 3_000,
            platformFeeCentsCustomer: 2_140,
            payoutCentsCook: 18_000,
            totalWithoutDiscountsCentsCustomer: 23_540,
            paymentStatus: 'EMPTY',
        });

        const result = await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, input: { preferences: ['vegetarian', 'no nuts'] } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestId });
        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.preferences).toEqual(['Vegetarian', 'No nuts']);
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer?.cookAccepted).toBeNull();
    });

    it('recalculates travel on venue change and sets TRAVEL priceAutoAdjustReason', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();
        const { offerId } = await insertOfferWithCook(bookingRequestId);
        const [before] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));

        const result = await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, input: { exactEventAddress: berlinAddress } },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer?.cookAccepted).toBeNull();
        expect(offer?.travelDistanceKm).not.toBe(before?.travelDistanceKm);
        expect(offer?.priceAutoAdjustReason).toBe('TRAVEL');
    });

    it('scales menu price when paid headcount changes and sets PARTICIPANTS reason', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();
        await testDb.insert(bookingRequestParticipants).values(
            Array.from({ length: 4 }, (_, index) => ({
                bookingRequestParticipantId: idCreate(),
                bookingRequestId,
                type: 'ADULT' as const,
                name: `Guest ${index + 1}`,
                restrictions: [],
            })),
        );
        const { offerId } = await insertOfferWithCook(bookingRequestId, 40_000);

        const result = await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestId,
                input: {
                    participants: [
                        { type: 'ADULT', name: 'Guest 1', restrictions: [] },
                        { type: 'ADULT', name: 'Guest 2', restrictions: [] },
                    ],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer?.cookAccepted).toBeNull();
        expect(offer?.menuPriceCents).toBe(20_000);
        expect(offer?.priceAutoAdjustReason).toBe('PARTICIPANTS');
    });

    it('clears adjustedMessage when null or blank', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();
        await testDb
            .update(bookingRequests)
            .set({ adjustedMessage: 'Keep this' })
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId));

        await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, input: { adjustedMessage: null } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [cleared] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(cleared?.adjustedMessage).toBeNull();
    });

    it('rejects unknown booking requests', async () => {
        const { admin } = await setupAdminAndRequest();

        await expect(
            adminBookingRequestUpdate(
                adminMutationParent(admin.user.userId),
                { bookingRequestId: idCreate(), input: { occasion: 'Nope' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/booking request not found/);
    });

    it('enqueues adjusted-message AI when original changes and adjusted is cleared', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();
        await testDb
            .update(bookingRequests)
            .set({ adjustedMessage: 'Old cook message' })
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'AI_BOOKING_REQUEST_MESSAGE', enabled: true })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });
        vi.mocked(admin.serverRuntime.jobs.enqueue).mockClear();

        await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestId,
                input: { originalMessage: 'Brand new customer note', adjustedMessage: null },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(admin.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(bookingRequestAdjustedMessageGenerate, {
            bookingRequestId,
        });
    });

    it('does not enqueue adjusted-message AI when a manual adjusted message is set', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'AI_BOOKING_REQUEST_MESSAGE', enabled: true })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });
        vi.mocked(admin.serverRuntime.jobs.enqueue).mockClear();

        await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestId,
                input: { originalMessage: 'Changed original', adjustedMessage: 'Manual cook text' },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(admin.serverRuntime.jobs.enqueue).not.toHaveBeenCalledWith(bookingRequestAdjustedMessageGenerate, expect.anything());
    });
});
