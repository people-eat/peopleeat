import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { authEmailOtps, users } from '../db/schema';
import { userKlaviyoProfileSync } from '../jobs/handlers/userKlaviyoProfileSync';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import * as authOtpUtils from '../utils/authOtpUtils';
import { emailAddressUpdateOtpRequest } from './emailAddressUpdateOtpRequest';
import { emailAddressUpdateOtpVerify } from './emailAddressUpdateOtpVerify';

describe('emailAddressUpdateOtp', () => {
    afterEach(() => {
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockRestore();
    });

    it('stores a hashed code, emails it, and publishes sessionUpdates', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('654321');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: idCreate() });
        const newEmail = `new-${idCreate().toLowerCase()}@example.com`;

        const result = await emailAddressUpdateOtpRequest(
            userMutationParent(user.userId),
            { emailAddress: newEmail.toUpperCase(), locale: 'en' },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: newEmail,
                purpose: 'EMAIL_ADDRESS_UPDATE_CONFIRM',
                locale: 'en',
                userId: user.userId,
            }),
        );
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({ sessionId: requestingSession.sessionId });

        const [row] = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(row?.emailAddress).toBe(newEmail);
        expect(row?.codeHash).toBe(authOtpUtils.authOtpCodeHash('654321', authOtpUtils.authOtpPepperRequire()));
    });

    it('rejects unchanged or taken emails without writing', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const other = await commandSetup.withUser({ emailAddress: `taken-${idCreate().toLowerCase()}@example.com` });
        const userEmail = user.emailAddress!;
        const otherEmail = other.user.emailAddress!;

        await expect(
            emailAddressUpdateOtpRequest(
                userMutationParent(user.userId),
                { emailAddress: userEmail, locale: 'de' },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/email unchanged/);

        await expect(
            emailAddressUpdateOtpRequest(
                userMutationParent(user.userId),
                { emailAddress: otherEmail, locale: 'de' },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/email already registered/);

        const rows = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(rows).toHaveLength(0);
        expect(serverRuntime.email.send).not.toHaveBeenCalled();
    });

    it('verifies the code and updates the user email', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('121212');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: idCreate() });
        const newEmail = `confirm-${idCreate().toLowerCase()}@example.com`;

        await emailAddressUpdateOtpRequest(
            userMutationParent(user.userId),
            { emailAddress: newEmail, locale: 'de' },
            requestingSession,
            serverRuntime,
        );

        const result = await emailAddressUpdateOtpVerify(
            userMutationParent(user.userId),
            { code: '121212' },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);

        const [updated] = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(updated?.emailAddress).toBe(newEmail);
        expect(updated?.previousEmailAddresses).toEqual([user.emailAddress]);

        const [otp] = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(otp?.consumedAt).not.toBeNull();
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.jobs.enqueue).toHaveBeenCalledWith(userKlaviyoProfileSync, { userId: user.userId });
    });

    it('appends previous emails and drops the live address when cycling back', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('343434');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: idCreate() });
        const firstEmail = user.emailAddress!;
        const secondEmail = `second-${idCreate().toLowerCase()}@example.com`;
        const thirdEmail = `third-${idCreate().toLowerCase()}@example.com`;

        await emailAddressUpdateOtpRequest(
            userMutationParent(user.userId),
            { emailAddress: secondEmail, locale: 'en' },
            requestingSession,
            serverRuntime,
        );
        await emailAddressUpdateOtpVerify(userMutationParent(user.userId), { code: '343434' }, requestingSession, serverRuntime);

        await emailAddressUpdateOtpRequest(
            userMutationParent(user.userId),
            { emailAddress: thirdEmail, locale: 'en' },
            requestingSession,
            serverRuntime,
        );
        await emailAddressUpdateOtpVerify(userMutationParent(user.userId), { code: '343434' }, requestingSession, serverRuntime);

        const [afterTwo] = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(afterTwo?.emailAddress).toBe(thirdEmail);
        expect(afterTwo?.previousEmailAddresses).toEqual([firstEmail, secondEmail]);

        await emailAddressUpdateOtpRequest(
            userMutationParent(user.userId),
            { emailAddress: firstEmail, locale: 'en' },
            requestingSession,
            serverRuntime,
        );
        await emailAddressUpdateOtpVerify(userMutationParent(user.userId), { code: '343434' }, requestingSession, serverRuntime);

        const [afterCycle] = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(afterCycle?.emailAddress).toBe(firstEmail);
        expect(afterCycle?.previousEmailAddresses).toEqual([secondEmail, thirdEmail]);
    });
});
