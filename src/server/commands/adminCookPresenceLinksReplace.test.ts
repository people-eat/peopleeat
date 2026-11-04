import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookPresenceLinksReplace } from './adminCookPresenceLinksReplace';

describe('adminCookPresenceLinksReplace', () => {
    it('saves links while COOK_PRESENCE_LINKS is off for the cook', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Review' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });

        const result = await adminCookPresenceLinksReplace(
            adminMutationParent(admin.user.userId),
            {
                cookId: cookUser.user.userId,
                input: {
                    takeAChefUrl: 'https://www.takeachef.com/de-de/chef/anna',
                    otherProfiles: [],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: cookUser.user.userId });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(row?.presenceLinks?.takeAChefUrl).toBe('https://www.takeachef.com/de-de/chef/anna');
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookUser.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });
});
