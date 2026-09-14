import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { cooks } from '../db/schema';
import type { GqlSCookCreate } from '../graphql/generated';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { userCookCreate } from './userCookCreate';

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
    biography: 'I cook with love',
    cuisineStyle: 'Italienisch',
    cookingPhilosophy: 'Saisonal',
    travelExpensesAmount: 40,
    maximumTravelDistance: 100,
};

describe('userCookCreate', () => {
    it('inserts a Cooks row with required profile fields', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1988-03-20',
            preferredCommunication: 'CALL',
        });
        vi.mocked(serverRuntime.places.locationSuggestions).mockResolvedValue([berlinSuggestion]);

        const result = await userCookCreate(userMutationParent(user.userId), { input: cookInput }, requestingSession, serverRuntime);

        expect(result).toEqual({ success: true, referenceId: user.userId });
        const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(cook?.isVisible).toBe(false);
        expect(cook?.isApprovedByAdmin).toBe(false);
        expect(cook?.biography).toBe('I cook with love');
        expect(cook?.cuisineStyle).toBe('Italienisch');
        expect(cook?.cookingPhilosophy).toBe('Saisonal');
        expect(cook?.travelExpensesAmount).toBe(40);
        expect(cook?.maximumTravelDistance).toBe(100);
        expect(cook?.exactTravelOriginAddress?.city).toBe('Berlin');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('accepts travel-only create without biography or catalogs', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1988-03-20',
            preferredCommunication: 'CALL',
        });
        vi.mocked(serverRuntime.places.locationSuggestions).mockResolvedValue([berlinSuggestion]);

        const result = await userCookCreate(
            userMutationParent(user.userId),
            {
                input: {
                    exactTravelOriginAddress: 'Unter den Linden 1 Berlin',
                    travelExpensesAmount: 40,
                    maximumTravelDistance: 100,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: user.userId });
        const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(cook?.biography).toBe('');
        expect(cook?.cuisineStyle).toBeNull();
        expect(cook?.cookingPhilosophy).toBeNull();
        expect(cook?.exactTravelOriginAddress?.city).toBe('Berlin');
    });

    it('rejects when already a cook', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1988-03-20',
            preferredCommunication: 'SMS',
        });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(serverRuntime.places.locationSuggestions).mockResolvedValue([berlinSuggestion]);

        await expect(
            userCookCreate(userMutationParent(user.userId), { input: cookInput }, requestingSession, serverRuntime),
        ).rejects.toThrow(/userCookCreate: already a cook/);
    });
});
