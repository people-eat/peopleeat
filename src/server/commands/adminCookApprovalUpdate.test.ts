import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminCookApprovalUpdate } from './adminCookApprovalUpdate';

describe('adminCookApprovalUpdate', () => {
    it('approves a cook, publishes both channels, and sends the approval email', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'cook-approval-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cook = await commandSetup.withUser({ firstName: 'pending-cook', lastName: 'User' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId, isApprovedByAdmin: false });

        // Act
        const result = await adminCookApprovalUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, isApprovedByAdmin: true },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cook.user.userId });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cook.user.userId));
        expect(row?.isApprovedByAdmin).toBe(true);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
        expect(admin.serverRuntime.email.send).toHaveBeenCalledOnce();
        const emailCall = vi.mocked(admin.serverRuntime.email.send).mock.calls[0]?.[0];
        expect(emailCall).toMatchObject({
            to: cook.user.emailAddress,
            purpose: 'COOK_APPROVED_BY_ADMIN',
            locale: 'de',
            relatedEntity: { type: 'COOK', id: cook.user.userId },
            userId: cook.user.userId,
        });
    });

    it('revokes cook approval without sending an email', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'cook-revoke-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cook = await commandSetup.withUser({ firstName: 'approved-cook', lastName: 'User' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId, isApprovedByAdmin: true });

        // Act
        const result = await adminCookApprovalUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, isApprovedByAdmin: false },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cook.user.userId });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cook.user.userId));
        expect(row?.isApprovedByAdmin).toBe(false);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
        expect(admin.serverRuntime.email.send).not.toHaveBeenCalled();
    });

    it('does not send an email when re-approving an already-approved cook', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'cook-already-approved-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cook = await commandSetup.withUser({ firstName: 'already-approved-cook', lastName: 'User' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId, isApprovedByAdmin: true });

        // Act
        const result = await adminCookApprovalUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, isApprovedByAdmin: true },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cook.user.userId });
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.email.send).not.toHaveBeenCalled();
    });

    it('throws when the cook is missing, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'cook-approval-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookId = idCreate();

        // Act + Assert
        await expect(
            adminCookApprovalUpdate(
                adminMutationParent(admin.user.userId),
                { cookId, isApprovedByAdmin: true },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/cook not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.email.send).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/cook not found/);
    });
});
