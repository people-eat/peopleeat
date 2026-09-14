import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookUpdate } from './adminCookUpdate';

describe('adminCookUpdate', () => {
    it('updates visibility and biography without requiring cook legal acceptance', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Pending' });
        await testDb.insert(cooks).values({
            cookId: cookUser.user.userId,
            isVisible: false,
            biography: 'Old',
            isApprovedByAdmin: false,
        });

        const result = await adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: { isVisible: true, biography: 'New bio' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: cookUser.user.userId });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(row?.isVisible).toBe(true);
        expect(row?.biography).toBe('New bio');
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookUser.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });
});
