import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cooks, fileUploads } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookUpdate } from './adminCookUpdate';
import { fileUploadCreate } from './fileUploadCreate';

async function seedAdminAndCook() {
    const admin = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Admin' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Pending' });
    await testDb.insert(cooks).values({
        cookId: cookUser.user.userId,
        isVisible: false,
        biography: 'Old',
        isApprovedByAdmin: false,
    });
    return { admin, cookUser };
}

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

    it('saves an empty default offer message without collapsing it to null', async () => {
        const { admin, cookUser } = await seedAdminAndCook();

        await adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: { defaultOfferMessage: '' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(row?.defaultOfferMessage).toBe('');
    });

    it('rejects a default offer message that contains a phone number', async () => {
        const { admin, cookUser } = await seedAdminAndCook();

        await expect(
            adminCookUpdate(
                adminMutationParent(admin.user.userId),
                { cookId: cookUser.user.userId, input: { defaultOfferMessage: 'Call +4915123456789' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/phone number/);
    });

    it('rejects when no fields are provided and leaves the cook unchanged', async () => {
        // Arrange
        const { admin, cookUser } = await seedAdminAndCook();
        const [before] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));

        // Act
        const act = adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: {} },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(act).rejects.toThrow(/at least one field is required/);
        const [after] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(after).toEqual(before);
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects invalid callDurationMinutes and leaves the cook unchanged', async () => {
        // Arrange
        const { admin, cookUser } = await seedAdminAndCook();
        const [before] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));

        // Act
        const act = adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: { callDurationMinutes: 20 } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(act).rejects.toThrow(/callDurationMinutes is invalid/);
        const [after] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(after).toEqual(before);
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects travelExpensesAmount below the minimum and leaves the cook unchanged', async () => {
        // Arrange
        const { admin, cookUser } = await seedAdminAndCook();
        const [before] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));

        // Act
        const act = adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: { travelExpensesAmount: 10 } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(act).rejects.toThrow(/travelExpensesAmount is below minimum/);
        const [after] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(after).toEqual(before);
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects maximumTravelDistance out of range and leaves the cook unchanged', async () => {
        // Arrange
        const { admin, cookUser } = await seedAdminAndCook();
        const [before] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));

        // Act
        const tooNear = adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: { maximumTravelDistance: 3 } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(tooNear).rejects.toThrow(/maximumTravelDistance is out of range/);
        await expect(
            adminCookUpdate(
                adminMutationParent(admin.user.userId),
                { cookId: cookUser.user.userId, input: { maximumTravelDistance: 300 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/maximumTravelDistance is out of range/);
        const [after] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(after).toEqual(before);
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects an invalid cuisineStyle and leaves the cook unchanged', async () => {
        // Arrange
        const { admin, cookUser } = await seedAdminAndCook();
        const [before] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));

        // Act
        const act = adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: { cuisineStyle: 'Not A Style' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(act).rejects.toThrow(/cuisineStyle is invalid/);
        const [after] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(after).toEqual(before);
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects an invalid cookingPhilosophy and leaves the cook unchanged', async () => {
        // Arrange
        const { admin, cookUser } = await seedAdminAndCook();
        const [before] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));

        // Act
        const act = adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: { cookingPhilosophy: 'Not A Philosophy' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(act).rejects.toThrow(/cookingPhilosophy is invalid/);
        const [after] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(after).toEqual(before);
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects when the cook row is missing and leaves other cooks unchanged', async () => {
        // Arrange
        const { admin, cookUser } = await seedAdminAndCook();
        const missing = await commandSetup.withUser({ firstName: 'No', lastName: 'Cook' });
        const [before] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));

        // Act
        const act = adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: missing.user.userId, input: { biography: 'Hello' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(act).rejects.toThrow(/cook not found/);
        const [after] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(after).toEqual(before);
        const missingRows = await testDb.select().from(cooks).where(eq(cooks.cookId, missing.user.userId));
        expect(missingRows).toHaveLength(0);
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('replaces the logo, reassigns upload ownership, and deletes the previous file', async () => {
        // Arrange
        const { admin, cookUser } = await seedAdminAndCook();
        const first = await fileUploadCreate(testDb, {
            userId: admin.user.userId,
            filename: 'logo-1.webp',
            mediaType: 'image/webp',
            bytes: Buffer.from([1, 2, 3]),
        });
        const second = await fileUploadCreate(testDb, {
            userId: admin.user.userId,
            filename: 'logo-2.webp',
            mediaType: 'image/webp',
            bytes: Buffer.from([4, 5, 6]),
        });

        // Act
        await adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: { logoFileUploadId: first.fileUploadId } },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const result = await adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: { logoFileUploadId: second.fileUploadId } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cookUser.user.userId });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(row?.logoFileUploadId).toBe(second.fileUploadId);
        const [owned] = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, second.fileUploadId));
        expect(owned?.userId).toBe(cookUser.user.userId);
        const previous = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, first.fileUploadId));
        expect(previous).toHaveLength(0);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookUser.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    });

    it('renames pathName without a feature toggle', async () => {
        const { admin, cookUser } = await seedAdminAndCook();
        const token = idCreate().toLowerCase();
        await testDb
            .update(cooks)
            .set({ pathName: `old-${token}` })
            .where(eq(cooks.cookId, cookUser.user.userId));

        const result = await adminCookUpdate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId, input: { pathName: `New ${token}` } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: cookUser.user.userId });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookUser.user.userId));
        expect(row?.pathName).toBe(`new-${token}`);
        expect(row?.previousPathNames).toEqual([`old-${token}`]);
    });
});
