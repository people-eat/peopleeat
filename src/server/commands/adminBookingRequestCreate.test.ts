import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestCooks, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminBookingRequestCreate } from './adminBookingRequestCreate';

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

const munichTravelOrigin = {
    displayText: 'München',
    latitude: 48.14,
    longitude: 11.58,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'München',
    postCode: '80331',
    state: 'BY',
    country: 'DE',
};

const stripeReady = {
    stripeAccountId: 'acct_test',
    stripeAccountActive: true,
    stripeAccountActiveWasReset: false,
};

describe('adminBookingRequestCreate', () => {
    it('creates a request for an existing customer', async () => {
        const admin = await commandSetup.withUser({ firstName: 'booking-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const customer = await commandSetup.withUser({
            firstName: 'booking-customer',
            lastName: 'Customer',
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });

        const result = await adminBookingRequestCreate(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    userId: customer.user.userId,
                    occasion: 'Birthday',
                    dateTime: new Date('2030-06-15T18:00:00.000Z'),
                    exactEventAddress: sampleAddress,
                    originalMessage: 'Please cook for us.',
                    preferences: [],
                    participants: [{ type: 'ADULT', name: 'Participant', restrictions: [] }],
                    cookIds: [],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, result.referenceId!));
        expect(row?.userId).toBe(customer.user.userId);
        expect(row?.publicationStatus).toBe('PUBLICATION_AUTO_APPROVED');

        const participants = await testDb
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, result.referenceId!));
        expect(participants).toHaveLength(1);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
    });

    it('admin-approves large groups and notifies only selected cooks', async () => {
        const admin = await commandSetup.withUser({ firstName: 'booking-admin-large', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const customer = await commandSetup.withUser({
            firstName: 'large-customer',
            lastName: 'Customer',
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'E_MAIL',
        });
        const cookA = await commandSetup.withUser({ firstName: 'large-cook-a', lastName: 'Chef' });
        const cookB = await commandSetup.withUser({ firstName: 'large-cook-b', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: cookA.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: munichTravelOrigin,
            maximumTravelDistance: 50,
            ...stripeReady,
        });
        await testDb.insert(cooks).values({
            cookId: cookB.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: munichTravelOrigin,
            maximumTravelDistance: 50,
            ...stripeReady,
        });

        const participants = Array.from({ length: 12 }, (_, index) => ({
            type: 'ADULT' as const,
            name: `Participant ${index + 1}`,
            restrictions: [] as string[],
        }));

        const result = await adminBookingRequestCreate(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    userId: customer.user.userId,
                    occasion: 'Company party',
                    dateTime: new Date('2030-07-01T18:00:00.000Z'),
                    exactEventAddress: sampleAddress,
                    originalMessage: 'Large group dinner.',
                    preferences: [],
                    participants,
                    cookIds: [cookA.user.userId],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, result.referenceId!));
        expect(row?.publicationStatus).toBe('PUBLICATION_APPROVED_BY_ADMIN');

        const notified = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(eq(bookingRequestCooks.bookingRequestId, result.referenceId!));
        expect(notified).toHaveLength(1);
        expect(notified[0]?.cookId).toBe(cookA.user.userId);
        expect(notified[0]?.notifiedAt).toBeTruthy();
    });

    it('notifies only the UI-selected subset for small groups', async () => {
        const admin = await commandSetup.withUser({ firstName: 'booking-admin-subset', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const customer = await commandSetup.withUser({
            firstName: 'subset-customer',
            lastName: 'Customer',
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'E_MAIL',
        });
        const cookA = await commandSetup.withUser({ firstName: 'subset-cook-a', lastName: 'Chef' });
        const cookB = await commandSetup.withUser({ firstName: 'subset-cook-b', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: cookA.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: munichTravelOrigin,
            maximumTravelDistance: 50,
            ...stripeReady,
        });
        await testDb.insert(cooks).values({
            cookId: cookB.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: munichTravelOrigin,
            maximumTravelDistance: 50,
            ...stripeReady,
        });

        const result = await adminBookingRequestCreate(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    userId: customer.user.userId,
                    occasion: 'Dinner',
                    dateTime: new Date('2030-08-01T18:00:00.000Z'),
                    exactEventAddress: sampleAddress,
                    originalMessage: 'Small dinner.',
                    preferences: [],
                    participants: [{ type: 'ADULT', name: 'Guest', restrictions: [] }],
                    cookIds: [cookB.user.userId],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        const notified = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(eq(bookingRequestCooks.bookingRequestId, result.referenceId!));
        expect(notified).toHaveLength(1);
        expect(notified[0]?.cookId).toBe(cookB.user.userId);
    });

    it('ignores cook ids outside travel radius', async () => {
        const admin = await commandSetup.withUser({ firstName: 'booking-admin-filter', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const customer = await commandSetup.withUser({
            firstName: 'filter-customer',
            lastName: 'Customer',
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'E_MAIL',
        });
        const farCook = await commandSetup.withUser({ firstName: 'far-cook', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: farCook.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: {
                displayText: 'Berlin',
                latitude: 52.52,
                longitude: 13.405,
                addressLine1: 'Street 1',
                addressLine2: '',
                city: 'Berlin',
                postCode: '10115',
                state: 'BE',
                country: 'DE',
            },
            maximumTravelDistance: 20,
            ...stripeReady,
        });

        const result = await adminBookingRequestCreate(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    userId: customer.user.userId,
                    occasion: 'Dinner',
                    dateTime: new Date('2030-09-01T18:00:00.000Z'),
                    exactEventAddress: sampleAddress,
                    originalMessage: 'Filter test.',
                    preferences: [],
                    participants: [{ type: 'ADULT', name: 'Guest', restrictions: [] }],
                    cookIds: [farCook.user.userId, idCreate()],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        const notified = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.bookingRequestId, result.referenceId!), eq(bookingRequestCooks.cookId, farCook.user.userId)));
        expect(notified).toHaveLength(0);
    });

    it('rejects an unknown customer', async () => {
        const admin = await commandSetup.withUser({ firstName: 'booking-admin-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminBookingRequestCreate(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        userId: idCreate(),
                        occasion: 'Birthday',
                        dateTime: new Date('2030-06-15T18:00:00.000Z'),
                        exactEventAddress: sampleAddress,
                        originalMessage: 'Please cook for us.',
                        preferences: [],
                        participants: [{ type: 'ADULT', name: 'Participant', restrictions: [] }],
                        cookIds: [],
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/user not found/);
    });
});
