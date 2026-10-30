import { describe, expect, it } from 'vitest';

import { cooks } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookOnboardingStepsFindMany } from './cookOnboardingStepsFindMany';

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

describe('cookOnboardingStepsFindMany', () => {
    it('lists every profile step for a new, unapproved cook', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'New', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: setup.user.userId, isApprovedByAdmin: false });

        // Act
        const steps = await cookOnboardingStepsFindMany(cookParent(setup.user.userId), setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(steps).toEqual(['TRAVEL', 'PROFILE_PICTURE', 'CHEF_PROFILE', 'FIRST_MEAL', 'FIRST_MENU']);
    });

    it('asks an approved cook to set up the wallet and drops completed steps', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Approved', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: setup.user.userId,
            isApprovedByAdmin: true,
            biography: 'Seasonal cooking',
            cuisineStyle: 'italian',
            cookingPhilosophy: 'seasonal',
            exactTravelOriginAddress: {
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
        });

        // Act
        const steps = await cookOnboardingStepsFindMany(cookParent(setup.user.userId), setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(steps).toEqual(['WALLET', 'PROFILE_PICTURE', 'FIRST_MEAL', 'FIRST_MENU']);
    });
});
