import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, featureToggleUserOverrides } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminFeatureToggleUserOverrideDelete } from './adminFeatureToggleUserOverrideDelete';

describe('adminFeatureToggleUserOverrideDelete', () => {
    it('removes a per-user override', async () => {
        const admin = await commandSetup.withUser({ firstName: 'override-del-admin', lastName: 'User' });
        const target = await commandSetup.withUser({ firstName: 'override-del-target', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        await testDb.insert(featureToggleUserOverrides).values({
            userId: target.user.userId,
            featureToggleKey: 'PUBLICATION_MENUS',
            enabled: true,
        });

        const result = await adminFeatureToggleUserOverrideDelete(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, featureToggleKey: 'PUBLICATION_MENUS' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        const rows = await testDb
            .select()
            .from(featureToggleUserOverrides)
            .where(
                and(
                    eq(featureToggleUserOverrides.userId, target.user.userId),
                    eq(featureToggleUserOverrides.featureToggleKey, 'PUBLICATION_MENUS'),
                ),
            );
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: target.user.userId });
    });
});
