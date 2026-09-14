import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { featureToggles, featureToggleUserOverrides } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionFeatureToggleFindActive } from './sessionFeatureToggleFindActive';

async function setGlobalToggle(featureToggleKey: 'ASSISTANT_CUSTOMER' | 'ASSISTANT_COOK' | 'PUBLICATION_MENUS', enabled: boolean) {
    await testDb.insert(featureToggles).values({ featureToggleKey, enabled }).onConflictDoUpdate({
        target: featureToggles.featureToggleKey,
        set: { enabled },
    });
}

describe('sessionFeatureToggleFindActive', () => {
    it('includes enabled keys and omits disabled keys', async () => {
        const { serverRuntime } = await commandSetup();
        await setGlobalToggle('ASSISTANT_CUSTOMER', true);
        await setGlobalToggle('ASSISTANT_COOK', false);

        const keys = await sessionFeatureToggleFindActive(serverRuntime);

        expect(keys).toContain('ASSISTANT_CUSTOMER');
        expect(keys).not.toContain('ASSISTANT_COOK');
    });

    it('omits keys with no row', async () => {
        const { serverRuntime } = await commandSetup();
        await testDb.delete(featureToggles).where(eq(featureToggles.featureToggleKey, 'PUBLICATION_MENUS'));

        const keys = await sessionFeatureToggleFindActive(serverRuntime);
        expect(keys).not.toContain('PUBLICATION_MENUS');
    });

    it('applies force-on and force-off overrides for a user', async () => {
        const user = await commandSetup.withUser({ firstName: 'session-toggle', lastName: 'User' });
        await setGlobalToggle('ASSISTANT_CUSTOMER', false);
        await setGlobalToggle('ASSISTANT_COOK', true);
        await testDb
            .insert(featureToggleUserOverrides)
            .values({ userId: user.user.userId, featureToggleKey: 'ASSISTANT_CUSTOMER', enabled: true })
            .onConflictDoUpdate({
                target: [featureToggleUserOverrides.userId, featureToggleUserOverrides.featureToggleKey],
                set: { enabled: true },
            });
        await testDb
            .insert(featureToggleUserOverrides)
            .values({ userId: user.user.userId, featureToggleKey: 'ASSISTANT_COOK', enabled: false })
            .onConflictDoUpdate({
                target: [featureToggleUserOverrides.userId, featureToggleUserOverrides.featureToggleKey],
                set: { enabled: false },
            });

        const keys = await sessionFeatureToggleFindActive(user.serverRuntime, user.user.userId);

        expect(keys).toContain('ASSISTANT_CUSTOMER');
        expect(keys).not.toContain('ASSISTANT_COOK');

        await testDb.delete(featureToggleUserOverrides).where(eq(featureToggleUserOverrides.userId, user.user.userId));
    });
});
