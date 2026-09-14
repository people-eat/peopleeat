import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cooks, users } from '../db/schema';
import type { GqlSCookCreate } from '../graphql/generated';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminUserCreate } from './adminUserCreate';

const berlinSuggestion = {
    displayText: 'Unter den Linden 1, 10117 Berlin, Germany',
    latitude: 52.517,
    longitude: 13.388,
    structuredAddress: {
        addressLine1: 'Unter den Linden 1',
        addressLine2: '',
        city: 'Berlin',
        postCode: '10117',
        state: 'BE',
        country: 'DE',
    },
};

const cookInput: GqlSCookCreate = {
    exactTravelOriginAddress: 'Unter den Linden 1 Berlin',
    biography: 'Admin-created chef',
    cuisineStyle: 'Italienisch',
    cookingPhilosophy: 'Saisonal',
    travelExpensesAmount: 30,
    maximumTravelDistance: 50,
};

function fullProfile(overrides: {
    emailAddress: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    asAdmin?: boolean;
    cook?: GqlSCookCreate;
}) {
    return {
        emailAddress: overrides.emailAddress,
        firstName: overrides.firstName ?? 'Created',
        lastName: overrides.lastName ?? 'User',
        phoneNumber: overrides.phoneNumber ?? phoneNumberCreate(),
        birthDate: '1990-01-15',
        preferredCommunication: 'E_MAIL' as const,
        asAdmin: overrides.asAdmin ?? false,
        cook: overrides.cook,
    };
}

describe('adminUserCreate', () => {
    it('creates a customer user with full profile and null legal acceptance', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'create-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const email = `create-customer-${idCreate().slice(0, 8).toLowerCase()}@example.com`;
        const phoneNumber = phoneNumberCreate();

        // Act
        const result = await adminUserCreate(
            adminMutationParent(admin.user.userId),
            {
                input: fullProfile({
                    emailAddress: email,
                    firstName: 'Created',
                    lastName: 'Customer',
                    phoneNumber,
                }),
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(users).where(eq(users.userId, result.referenceId!));
        expect(row).toMatchObject({
            emailAddress: email,
            firstName: 'Created',
            lastName: 'Customer',
            phoneNumber,
            birthDate: '1990-01-15',
            preferredCommunication: 'E_MAIL',
            timeZone: 'Europe/Berlin',
            lastAcceptedPrivacyPolicy: null,
            lastAcceptedTerms: null,
        });
        const cookRows = await testDb.select().from(cooks).where(eq(cooks.cookId, result.referenceId!));
        expect(cookRows).toHaveLength(0);
    });

    it('creates cook and admin membership rows when requested', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'create-admin-2', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const email = `Create.Cook.Admin-${idCreate().slice(0, 8)}@Example.COM`;
        vi.mocked(admin.serverRuntime.places.locationSuggestions).mockResolvedValue([berlinSuggestion]);

        // Act
        const result = await adminUserCreate(
            adminMutationParent(admin.user.userId),
            {
                input: fullProfile({
                    emailAddress: email,
                    firstName: '  Cook  ',
                    lastName: '  Admin  ',
                    asAdmin: true,
                    cook: cookInput,
                }),
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(users).where(eq(users.userId, result.referenceId!));
        expect(row?.emailAddress).toBe(email.trim().toLowerCase());
        expect(row?.firstName).toBe('Cook');
        expect(row?.lastName).toBe('Admin');
        const adminRows = await testDb.select().from(admins).where(eq(admins.adminId, result.referenceId!));
        const cookRows = await testDb.select().from(cooks).where(eq(cooks.cookId, result.referenceId!));
        expect(adminRows).toHaveLength(1);
        expect(cookRows).toHaveLength(1);
        expect(cookRows[0]?.biography).toBe('Admin-created chef');
        expect(cookRows[0]?.exactTravelOriginAddress?.city).toBe('Berlin');
    });

    it('rejects a duplicate email', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'create-admin-3', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const existing = await commandSetup.withUser({ firstName: 'already-there', lastName: 'User' });

        // Act / Assert
        await expect(
            adminUserCreate(
                adminMutationParent(admin.user.userId),
                {
                    input: fullProfile({
                        emailAddress: existing.user.emailAddress!,
                        firstName: 'Dup',
                        lastName: 'User',
                    }),
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/email already registered/);
    });

    it('rejects a duplicate phone number', async () => {
        const admin = await commandSetup.withUser({ firstName: 'create-admin-4', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const phoneNumber = phoneNumberCreate();
        await commandSetup.withUser({
            firstName: 'phone-owner',
            lastName: 'User',
            phoneNumber,
        });

        await expect(
            adminUserCreate(
                adminMutationParent(admin.user.userId),
                {
                    input: fullProfile({
                        emailAddress: `other-${idCreate().slice(0, 8)}@example.com`,
                        phoneNumber,
                    }),
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/phoneNumber already registered/);
    });

    it('rejects a birth date under the minimum age', async () => {
        const admin = await commandSetup.withUser({ firstName: 'create-admin-5', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminUserCreate(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        ...fullProfile({
                            emailAddress: `underage-${idCreate().slice(0, 8)}@example.com`,
                        }),
                        birthDate: `${new Date().getFullYear() - 10}-01-01`,
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/adminUserCreate: birthDate must be at least 18 years ago/);
    });
});
