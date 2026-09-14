import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, featureToggleUserOverrides } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminFeatureToggleUserOverrideUpsert } from './adminFeatureToggleUserOverrideUpsert';

describe('adminFeatureToggleUserOverrideUpsert', () => {
    it('creates and updates a per-user override', async () => {
        const admin = await commandSetup.withUser({ firstName: 'override-admin', lastName: 'User' });
        const target = await commandSetup.withUser({ firstName: 'override-target', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        const created = await adminFeatureToggleUserOverrideUpsert(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, featureToggleKey: 'ASSISTANT_CUSTOMER', enabled: true },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(created.success).toBe(true);
        expect(created.referenceId).toBe(target.user.userId);
        const [row] = await testDb
            .select()
            .from(featureToggleUserOverrides)
            .where(
                and(
                    eq(featureToggleUserOverrides.userId, target.user.userId),
                    eq(featureToggleUserOverrides.featureToggleKey, 'ASSISTANT_CUSTOMER'),
                ),
            );
        expect(row?.enabled).toBe(true);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: target.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();

        const updated = await adminFeatureToggleUserOverrideUpsert(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, featureToggleKey: 'ASSISTANT_CUSTOMER', enabled: false },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(updated.success).toBe(true);
        const [updatedRow] = await testDb
            .select()
            .from(featureToggleUserOverrides)
            .where(
                and(
                    eq(featureToggleUserOverrides.userId, target.user.userId),
                    eq(featureToggleUserOverrides.featureToggleKey, 'ASSISTANT_CUSTOMER'),
                ),
            );
        expect(updatedRow?.enabled).toBe(false);
    });
});
