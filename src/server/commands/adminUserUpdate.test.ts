import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, users } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminUserUpdate } from './adminUserUpdate';

describe('adminUserUpdate', () => {
    it('updates name fields and publishes user + admin updates', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Before', lastName: 'Name' });

        const result = await adminUserUpdate(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, user: { firstName: 'After', lastName: 'Person' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: target.user.userId });
        const [row] = await testDb.select().from(users).where(eq(users.userId, target.user.userId));
        expect(row?.firstName).toBe('After');
        expect(row?.lastName).toBe('Person');
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: target.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('updates timeZone', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ timeZone: 'Europe/Berlin' });

        const result = await adminUserUpdate(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, user: { timeZone: 'America/New_York' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: target.user.userId });
        const [row] = await testDb.select().from(users).where(eq(users.userId, target.user.userId));
        expect(row?.timeZone).toBe('America/New_York');
    });

    it('rejects empty firstName', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Keep', lastName: 'Name' });

        await expect(
            adminUserUpdate(
                adminMutationParent(admin.user.userId),
                { userId: target.user.userId, user: { firstName: '   ' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/firstName must not be empty/);

        const [row] = await testDb.select().from(users).where(eq(users.userId, target.user.userId));
        expect(row?.firstName).toBe('Keep');
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });
});
