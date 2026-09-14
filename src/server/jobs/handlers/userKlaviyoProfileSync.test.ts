import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { users } from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { phoneNumberCreate } from '../../test/phoneNumberCreate';
import { userKlaviyoProfileSync } from './userKlaviyoProfileSync';

describe('userKlaviyoProfileSync', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('no-ops when Klaviyo is not configured', async () => {
        const { serverRuntime, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.klaviyo.isConfigured).mockReturnValue(false);

        await userKlaviyoProfileSync.handler({ data: { userId: user.userId }, serverRuntime });

        expect(serverRuntime.klaviyo.profileUpsert).not.toHaveBeenCalled();
    });

    it('loads the user and upserts the Klaviyo profile', async () => {
        const phoneNumber = phoneNumberCreate();
        const { serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Lovelace',
            phoneNumber,
        });
        vi.mocked(serverRuntime.klaviyo.isConfigured).mockReturnValue(true);
        vi.mocked(serverRuntime.klaviyo.profileUpsert).mockResolvedValue(undefined);

        await userKlaviyoProfileSync.handler({ data: { userId: user.userId }, serverRuntime });

        expect(serverRuntime.klaviyo.profileUpsert).toHaveBeenCalledWith({
            externalId: user.userId,
            email: user.emailAddress,
            firstName: 'Ada',
            lastName: 'Lovelace',
            phoneNumber,
        });
    });

    it('skips when the user row is gone', async () => {
        const { serverRuntime, user } = await commandSetup.withUser();
        await testDb.delete(users).where(eq(users.userId, user.userId));
        vi.mocked(serverRuntime.klaviyo.isConfigured).mockReturnValue(true);

        await userKlaviyoProfileSync.handler({ data: { userId: user.userId }, serverRuntime });

        expect(serverRuntime.klaviyo.profileUpsert).not.toHaveBeenCalled();
    });

    it('skips when the user has no email (anonymized)', async () => {
        const { serverRuntime, user } = await commandSetup.withUser();
        await testDb.update(users).set({ emailAddress: null, status: 'ANONYMIZED' }).where(eq(users.userId, user.userId));
        vi.mocked(serverRuntime.klaviyo.isConfigured).mockReturnValue(true);

        await userKlaviyoProfileSync.handler({ data: { userId: user.userId }, serverRuntime });

        expect(serverRuntime.klaviyo.profileUpsert).not.toHaveBeenCalled();
    });
});
