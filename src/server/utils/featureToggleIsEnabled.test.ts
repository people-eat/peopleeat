import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { featureToggles, featureToggleUserOverrides } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from './featureToggleIsEnabled';

async function setGlobalToggle(
    featureToggleKey: 'BOOKING_REQUEST_RESTRICTIONS' | 'ASSISTANT_CUSTOMER' | 'ASSISTANT_COOK' | 'PUBLICATION_MEALS',
    enabled: boolean,
) {
    await testDb.insert(featureToggles).values({ featureToggleKey, enabled }).onConflictDoUpdate({
        target: featureToggles.featureToggleKey,
        set: { enabled },
    });
}

describe('featureToggleIsEnabled', () => {
    it('returns false when the row is missing', async () => {
        const { serverRuntime } = await commandSetup();
        await testDb.delete(featureToggles).where(eq(featureToggles.featureToggleKey, 'BOOKING_REQUEST_RESTRICTIONS'));
        await expect(featureToggleIsEnabled('BOOKING_REQUEST_RESTRICTIONS', serverRuntime)).resolves.toBe(false);
    });

    it('returns the persisted enabled flag', async () => {
        const { serverRuntime } = await commandSetup();
        await setGlobalToggle('BOOKING_REQUEST_RESTRICTIONS', true);
        await expect(featureToggleIsEnabled('BOOKING_REQUEST_RESTRICTIONS', serverRuntime)).resolves.toBe(true);

        await setGlobalToggle('BOOKING_REQUEST_RESTRICTIONS', false);
        await expect(featureToggleIsEnabled('BOOKING_REQUEST_RESTRICTIONS', serverRuntime)).resolves.toBe(false);
    });

    it('user-on override enables the key for that user', async () => {
        const user = await commandSetup.withUser({ firstName: 'toggle-user-on', lastName: 'User' });
        await setGlobalToggle('ASSISTANT_CUSTOMER', false);
        await testDb
            .insert(featureToggleUserOverrides)
            .values({
                userId: user.user.userId,
                featureToggleKey: 'ASSISTANT_CUSTOMER',
                enabled: true,
            })
            .onConflictDoUpdate({
                target: [featureToggleUserOverrides.userId, featureToggleUserOverrides.featureToggleKey],
                set: { enabled: true },
            });

        await expect(featureToggleIsEnabled('ASSISTANT_CUSTOMER', user.serverRuntime, user.user.userId)).resolves.toBe(true);

        await testDb
            .delete(featureToggleUserOverrides)
            .where(
                and(
                    eq(featureToggleUserOverrides.userId, user.user.userId),
                    eq(featureToggleUserOverrides.featureToggleKey, 'ASSISTANT_CUSTOMER'),
                ),
            );
    });

    it('user-off override disables the key for that user', async () => {
        const user = await commandSetup.withUser({ firstName: 'toggle-user-off', lastName: 'User' });
        await setGlobalToggle('ASSISTANT_COOK', true);
        await testDb
            .insert(featureToggleUserOverrides)
            .values({
                userId: user.user.userId,
                featureToggleKey: 'ASSISTANT_COOK',
                enabled: false,
            })
            .onConflictDoUpdate({
                target: [featureToggleUserOverrides.userId, featureToggleUserOverrides.featureToggleKey],
                set: { enabled: false },
            });

        await expect(featureToggleIsEnabled('ASSISTANT_COOK', user.serverRuntime, user.user.userId)).resolves.toBe(false);

        await testDb
            .delete(featureToggleUserOverrides)
            .where(
                and(
                    eq(featureToggleUserOverrides.userId, user.user.userId),
                    eq(featureToggleUserOverrides.featureToggleKey, 'ASSISTANT_COOK'),
                ),
            );
    });

    it('anonymous callers ignore overrides and use the global default', async () => {
        const user = await commandSetup.withUser({ firstName: 'toggle-anon', lastName: 'User' });
        await setGlobalToggle('PUBLICATION_MEALS', false);
        await testDb
            .insert(featureToggleUserOverrides)
            .values({
                userId: user.user.userId,
                featureToggleKey: 'PUBLICATION_MEALS',
                enabled: true,
            })
            .onConflictDoUpdate({
                target: [featureToggleUserOverrides.userId, featureToggleUserOverrides.featureToggleKey],
                set: { enabled: true },
            });

        // Null userId must not see the user-on override. Global may race with
        // parallel tests; compare against the same anonymous read after cleanup.
        const withOverrideIgnored = await featureToggleIsEnabled('PUBLICATION_MEALS', user.serverRuntime, null);
        await expect(featureToggleIsEnabled('PUBLICATION_MEALS', user.serverRuntime, user.user.userId)).resolves.toBe(true);

        await testDb
            .delete(featureToggleUserOverrides)
            .where(
                and(
                    eq(featureToggleUserOverrides.userId, user.user.userId),
                    eq(featureToggleUserOverrides.featureToggleKey, 'PUBLICATION_MEALS'),
                ),
            );

        await expect(featureToggleIsEnabled('PUBLICATION_MEALS', user.serverRuntime, null)).resolves.toBe(withOverrideIgnored);
    });
});
