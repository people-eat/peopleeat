import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { admins, cooks, featureToggles, featureToggleUserOverrides } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminCookBiographySuggest } from './adminCookBiographySuggest';
import { cookBiographySuggestGenerate } from './cookBiographySuggestGenerate';

vi.mock('./cookBiographySuggestGenerate', () => ({
    cookBiographySuggestGenerate: vi.fn(),
}));

async function setBiographyAiWrite(enabled: boolean) {
    await testDb.insert(featureToggles).values({ featureToggleKey: 'COOK_BIOGRAPHY_AI_WRITE', enabled }).onConflictDoUpdate({
        target: featureToggles.featureToggleKey,
        set: { enabled },
    });
}

async function seedAdminAndCook() {
    const admin = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Admin' });
    const cook = await commandSetup.withUser({ firstName: 'Bea', lastName: 'Cook' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    await testDb.insert(cooks).values({ cookId: cook.user.userId, biography: 'Bestehend' });
    return { admin, cook };
}

describe('adminCookBiographySuggest', () => {
    beforeEach(() => {
        vi.mocked(cookBiographySuggestGenerate).mockReset();
    });

    it('rejects when COOK_BIOGRAPHY_AI_WRITE is disabled and does not generate', async () => {
        // Arrange
        const { admin, cook } = await seedAdminAndCook();
        await setBiographyAiWrite(false);

        // Act
        const pending = adminCookBiographySuggest(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, currentBiography: 'Bestehend' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/COOK_BIOGRAPHY_AI_WRITE is disabled/);
        expect(cookBiographySuggestGenerate).not.toHaveBeenCalled();
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cook.user.userId));
        expect(row?.biography).toBe('Bestehend');
        const logs = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logs.some((entry) => entry.level === 'error' && entry.message.includes('COOK_BIOGRAPHY_AI_WRITE is disabled'))).toBe(true);
    });

    it('returns the generator result when COOK_BIOGRAPHY_AI_WRITE is enabled', async () => {
        // Arrange
        const { admin, cook } = await seedAdminAndCook();
        await setBiographyAiWrite(true);
        vi.mocked(cookBiographySuggestGenerate).mockResolvedValue('Vorgeschlagene Biografie');

        // Act
        const result = await adminCookBiographySuggest(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, currentBiography: 'Bestehend' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toBe('Vorgeschlagene Biografie');
        expect(cookBiographySuggestGenerate).toHaveBeenCalledWith({
            cookId: cook.user.userId,
            currentBiography: 'Bestehend',
            requestingSession: admin.requestingSession,
            serverRuntime: admin.serverRuntime,
        });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cook.user.userId));
        expect(row?.biography).toBe('Bestehend');
    });

    it('rejects when a cook override disables the flag', async () => {
        // Arrange
        const { admin, cook } = await seedAdminAndCook();
        await setBiographyAiWrite(true);
        await testDb.insert(featureToggleUserOverrides).values({
            userId: cook.user.userId,
            featureToggleKey: 'COOK_BIOGRAPHY_AI_WRITE',
            enabled: false,
        });

        // Act
        const pending = adminCookBiographySuggest(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, currentBiography: '' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/COOK_BIOGRAPHY_AI_WRITE is disabled/);
        expect(cookBiographySuggestGenerate).not.toHaveBeenCalled();
    });

    it('generates when a cook override enables the flag', async () => {
        // Arrange
        const { admin, cook } = await seedAdminAndCook();
        await setBiographyAiWrite(false);
        await testDb.insert(featureToggleUserOverrides).values({
            userId: cook.user.userId,
            featureToggleKey: 'COOK_BIOGRAPHY_AI_WRITE',
            enabled: true,
        });
        vi.mocked(cookBiographySuggestGenerate).mockResolvedValue('Override Biografie');

        // Act
        const result = await adminCookBiographySuggest(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, currentBiography: 'Text' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toBe('Override Biografie');
        expect(cookBiographySuggestGenerate).toHaveBeenCalledOnce();
    });

    it('logs and rethrows when the generator throws', async () => {
        // Arrange
        const { admin, cook } = await seedAdminAndCook();
        await setBiographyAiWrite(true);
        vi.mocked(cookBiographySuggestGenerate).mockRejectedValue(new Error('model down'));

        // Act
        const pending = adminCookBiographySuggest(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, currentBiography: 'Text' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/model down/);
        const logs = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logs.some((entry) => entry.level === 'error' && entry.message.includes('model down'))).toBe(true);
    });
});
