import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, featureToggles } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminFeatureToggleUpdate } from './adminFeatureToggleUpdate';

describe('adminFeatureToggleUpdate', () => {
    it('creates a row on first enable', async () => {
        const admin = await commandSetup.withUser({ firstName: 'feature-toggle-create', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        await testDb.delete(featureToggles).where(eq(featureToggles.featureToggleKey, 'ASSISTANT_CUSTOMER'));

        const result = await adminFeatureToggleUpdate(
            adminMutationParent(admin.user.userId),
            { featureToggleKey: 'ASSISTANT_CUSTOMER', enabled: true },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBe('ASSISTANT_CUSTOMER');
        const [row] = await testDb.select().from(featureToggles).where(eq(featureToggles.featureToggleKey, 'ASSISTANT_CUSTOMER'));
        expect(row?.enabled).toBe(true);
    });

    it('updates an existing row on conflict', async () => {
        const admin = await commandSetup.withUser({ firstName: 'feature-toggle-update', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        await testDb.delete(featureToggles).where(eq(featureToggles.featureToggleKey, 'PUBLICATION_MEALS'));
        await testDb.insert(featureToggles).values({
            featureToggleKey: 'PUBLICATION_MEALS',
            enabled: true,
        });

        const result = await adminFeatureToggleUpdate(
            adminMutationParent(admin.user.userId),
            { featureToggleKey: 'PUBLICATION_MEALS', enabled: false },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(featureToggles).where(eq(featureToggles.featureToggleKey, 'PUBLICATION_MEALS'));
        expect(row?.enabled).toBe(false);
    });
});
