import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, users } from '../db/schema';
import { userKlaviyoProfileSync } from '../jobs';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminUserEmailAddressUpdate } from './adminUserEmailAddressUpdate';

describe('adminUserEmailAddressUpdate', () => {
    it('sets email, archives previous, and enqueues Klaviyo sync', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Email', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Target', lastName: 'User' });
        const previous = target.user.emailAddress!;
        const next = `new-${idCreate().slice(0, 8)}@example.com`;

        const result = await adminUserEmailAddressUpdate(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, emailAddress: next },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: target.user.userId });
        const [row] = await testDb.select().from(users).where(eq(users.userId, target.user.userId));
        expect(row?.emailAddress).toBe(next);
        expect(row?.previousEmailAddresses).toEqual([previous]);
        expect(admin.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(userKlaviyoProfileSync, { userId: target.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects an email already registered to another user', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Email', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const taken = await commandSetup.withUser({ firstName: 'Taken', lastName: 'User' });
        const target = await commandSetup.withUser({ firstName: 'Target', lastName: 'User' });

        await expect(
            adminUserEmailAddressUpdate(
                adminMutationParent(admin.user.userId),
                { userId: target.user.userId, emailAddress: taken.user.emailAddress! },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/email already registered/);
    });
});
