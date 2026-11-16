import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestCooks,
    bookingRequestParticipants,
    bookingRequests,
    cooks,
    featureToggles,
    fileUploads,
    meals,
    menuCourseMealOptions,
    menuCourses,
    menus,
    sessionEvents,
} from '../db/schema';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { userBookingRequestCreate } from './userBookingRequestCreate';

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

async function insertCatalogMenu(cookId: string, options?: { published?: boolean; title?: string }) {
    const menuId = idCreate();
    const mealId = idCreate();
    const courseId = idCreate();
    const imageFileUploadId = idCreate();
    await testDb.insert(fileUploads).values({
        fileUploadId: imageFileUploadId,
        userId: cookId,
        filename: 'meal.jpg',
        mediaType: 'image/jpeg',
        size: 3,
        bytes: Buffer.from([1, 2, 3]),
    });
    await testDb.insert(meals).values({
        mealId,
        cookId,
        title: 'Vorspeise',
        description: 'Salat',
        imageFileUploadId,
    });
    await testDb.insert(menus).values({
        menuId,
        cookId,
        title: options?.title ?? 'Sommer-Menü',
        description: 'Drei Gänge',
        publishedAt: options?.published === false ? null : new Date(),
    });
    await testDb.insert(menuCourses).values({
        courseId,
        menuId,
        cookId,
        index: 0,
        title: 'Starter',
    });
    await testDb.insert(menuCourseMealOptions).values({
        mealOptionId: idCreate(),
        courseId,
        cookId,
        mealId,
        index: 0,
    });
    return menuId;
}

const sampleCreateInput = {
    occasion: 'Birthday',
    dateTime: new Date('2030-06-15T18:00:00.000Z'),
    exactEventAddress: sampleAddress,
    originalMessage: 'Please cook for us.',
    preferences: [],
    participants: [{ type: 'ADULT' as const, name: 'Participant', restrictions: [] }],
    priceClassType: 'MEDIUM' as const,
};

describe('userBookingRequestCreate', () => {
    it('creates a request with participants', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });

        const result = await userBookingRequestCreate(
            userMutationParent(user.userId),
            { input: sampleCreateInput },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, result.referenceId!));
        expect(row?.userId).toBe(user.userId);
        expect(row?.publicationStatus).toBe('PUBLICATION_AUTO_APPROVED');
        expect(row?.priceClassType).toBe('MEDIUM');
        expect(row?.expiresAt).toBeTruthy();
        expect(row?.expiresAt?.toISOString()).toBe('2030-06-15T23:59:59.999Z');

        const participants = await testDb
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, result.referenceId!));
        expect(participants).toHaveLength(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();

        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, requestingSession.sessionId));
        expect(events.some((event) => event.type === 'BOOKING_REQUEST_CREATED')).toBe(true);
    });

    it('creates a request without a price class when omitted', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });

        const { priceClassType: _omitted, ...inputWithoutPriceClass } = sampleCreateInput;
        const result = await userBookingRequestCreate(
            userMutationParent(user.userId),
            { input: inputWithoutPriceClass },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, result.referenceId!));
        expect(row?.priceClassType).toBeNull();
    });

    it('rejects when the user is a cook', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        await testDb.insert(cooks).values({ cookId: user.userId });

        await expect(
            userBookingRequestCreate(userMutationParent(user.userId), { input: sampleCreateInput }, requestingSession, serverRuntime),
        ).rejects.toThrow(/userBookingRequestCreate: cooks cannot create booking requests/);
    });

    it('creates an exclusive chef-page request when the toggle is on and the cook is offer-ready', async () => {
        const customer = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
        });
        const chef = await commandSetup.withUser({ firstName: 'Direct', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: chef.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            stripeAccountId: 'acct_direct',
            stripeAccountActive: true,
            exactTravelOriginAddress: sampleAddress,
        });
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'BOOKING_REQUEST_COOK_DIRECT', enabled: true })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });

        const result = await userBookingRequestCreate(
            userMutationParent(customer.user.userId),
            { input: { ...sampleCreateInput, requestedCookId: chef.user.userId } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, result.referenceId!));
        expect(row?.publicationStatus).toBe('PUBLICATION_DIRECT_TO_COOK');
        expect(row?.requestedCookId).toBe(chef.user.userId);

        const affinity = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(eq(bookingRequestCooks.bookingRequestId, result.referenceId!));
        expect(affinity).toHaveLength(1);
        expect(affinity[0]?.cookId).toBe(chef.user.userId);
        expect(affinity[0]?.notifiedAt).toBeTruthy();

        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, customer.requestingSession.sessionId));
        const created = events.find((event) => event.type === 'BOOKING_REQUEST_CREATED');
        expect(created?.payload).toMatchObject({ requestedCookId: chef.user.userId });
    });

    it('freezes a catalog menu on the requested cook affinity row', async () => {
        const customer = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
        });
        const chef = await commandSetup.withUser({ firstName: 'Menu', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: chef.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            stripeAccountId: 'acct_menu',
            stripeAccountActive: true,
            exactTravelOriginAddress: sampleAddress,
        });
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'BOOKING_REQUEST_COOK_DIRECT', enabled: true })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });
        const menuId = await insertCatalogMenu(chef.user.userId, { title: 'Tasting' });

        const result = await userBookingRequestCreate(
            userMutationParent(customer.user.userId),
            { input: { ...sampleCreateInput, requestedCookId: chef.user.userId, requestedMenuId: menuId } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        const [affinity] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(eq(bookingRequestCooks.bookingRequestId, result.referenceId!));
        expect(affinity?.cookId).toBe(chef.user.userId);
        expect(affinity?.requestedMenuId).toBe(menuId);
        expect(affinity?.requestedMenu?.title).toBe('Tasting');

        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, customer.requestingSession.sessionId));
        const created = events.find((event) => event.type === 'BOOKING_REQUEST_CREATED');
        expect(created?.payload).toMatchObject({ requestedCookId: chef.user.userId, requestedMenuId: menuId });
    });

    it('keeps the exclusive cook and drops a leftover menu that is not catalog-eligible', async () => {
        const customer = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
        });
        const chef = await commandSetup.withUser({ firstName: 'Draft', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: chef.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            stripeAccountId: 'acct_draft_menu',
            stripeAccountActive: true,
            exactTravelOriginAddress: sampleAddress,
        });
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'BOOKING_REQUEST_COOK_DIRECT', enabled: true })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });
        const menuId = await insertCatalogMenu(chef.user.userId, { published: false });

        const result = await userBookingRequestCreate(
            userMutationParent(customer.user.userId),
            { input: { ...sampleCreateInput, requestedCookId: chef.user.userId, requestedMenuId: menuId } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, result.referenceId!));
        expect(row?.publicationStatus).toBe('PUBLICATION_DIRECT_TO_COOK');
        expect(row?.requestedCookId).toBe(chef.user.userId);

        const [affinity] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(eq(bookingRequestCooks.bookingRequestId, result.referenceId!));
        expect(affinity?.requestedMenuId).toBeNull();
        expect(affinity?.requestedMenu).toBeNull();
    });

    it('ignores requestedCookId when the entry toggle is off', async () => {
        const customer = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
        });
        const chef = await commandSetup.withUser({ firstName: 'Off', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: chef.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            stripeAccountId: 'acct_off',
            stripeAccountActive: true,
            exactTravelOriginAddress: sampleAddress,
        });
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'BOOKING_REQUEST_COOK_DIRECT', enabled: false })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: false },
            });

        const result = await userBookingRequestCreate(
            userMutationParent(customer.user.userId),
            { input: { ...sampleCreateInput, requestedCookId: chef.user.userId } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, result.referenceId!));
        expect(row?.publicationStatus).toBe('PUBLICATION_AUTO_APPROVED');
        expect(row?.requestedCookId).toBeNull();
    });

    it('rejects a Netherlands event address before guest launch', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });

        await expect(
            userBookingRequestCreate(
                userMutationParent(user.userId),
                {
                    input: {
                        ...sampleCreateInput,
                        exactEventAddress: {
                            ...sampleAddress,
                            displayText: 'Dam 1, 1012 JS Amsterdam',
                            city: 'Amsterdam',
                            postCode: '1012 JS',
                            country: 'NL',
                        },
                    },
                },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/bookingRequestMarketClosed:netherlands/);
    });
});
