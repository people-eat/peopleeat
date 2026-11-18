import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { admins, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminCookBiographySummarySuggest } from './adminCookBiographySummarySuggest';
import { cookBiographySummaryGenerate } from './cookBiographySummaryGenerate';

vi.mock('./cookBiographySummaryGenerate', () => ({
    cookBiographySummaryGenerate: vi.fn(),
}));

async function seedAdminAndCook() {
    const admin = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Admin' });
    const cook = await commandSetup.withUser({ firstName: 'Roland', lastName: 'Cook' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    await testDb.insert(cooks).values({ cookId: cook.user.userId, biographySummary: 'Unverändert' });
    return { admin, cook };
}

describe('adminCookBiographySummarySuggest', () => {
    beforeEach(() => {
        vi.mocked(cookBiographySummaryGenerate).mockReset();
    });

    it('rejects blank biography before calling the generator', async () => {
        // Arrange
        const { admin, cook } = await seedAdminAndCook();

        // Act
        const pending = adminCookBiographySummarySuggest(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, biography: '   ' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/biography is required/);
        expect(cookBiographySummaryGenerate).not.toHaveBeenCalled();
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cook.user.userId));
        expect(row?.biographySummary).toBe('Unverändert');
        const logs = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logs.filter((entry) => entry.level === 'error')).toHaveLength(0);
    });

    it('returns the generator summary and passes the trimmed biography', async () => {
        // Arrange
        const { admin, cook } = await seedAdminAndCook();
        vi.mocked(cookBiographySummaryGenerate).mockResolvedValue({
            biography: 'Roland arbeitete in Saalbach.',
            biographySummary: 'Roland kochte in Saalbach.',
        });

        // Act
        const result = await adminCookBiographySummarySuggest(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, biography: '  Roland arbeitete in Saalbach.  ' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toBe('Roland kochte in Saalbach.');
        expect(cookBiographySummaryGenerate).toHaveBeenCalledWith({
            cookId: cook.user.userId,
            biography: 'Roland arbeitete in Saalbach.',
            requestingSession: admin.requestingSession,
            serverRuntime: admin.serverRuntime,
        });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cook.user.userId));
        expect(row?.biographySummary).toBe('Unverändert');
    });

    it('rejects and logs when generation returns nothing', async () => {
        // Arrange
        const { admin, cook } = await seedAdminAndCook();
        vi.mocked(cookBiographySummaryGenerate).mockResolvedValue(null);

        // Act
        const pending = adminCookBiographySummarySuggest(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, biography: 'Eine Biografie.' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/generation failed/);
        const logs = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logs.some((entry) => entry.level === 'error' && entry.message.includes('generation failed'))).toBe(true);
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cook.user.userId));
        expect(row?.biographySummary).toBe('Unverändert');
    });

    it('logs and rethrows when the generator throws', async () => {
        // Arrange
        const { admin, cook } = await seedAdminAndCook();
        vi.mocked(cookBiographySummaryGenerate).mockRejectedValue(new Error('model down'));

        // Act
        const pending = adminCookBiographySummarySuggest(
            adminMutationParent(admin.user.userId),
            { cookId: cook.user.userId, biography: 'Eine Biografie.' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/model down/);
        const logs = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logs.some((entry) => entry.level === 'error' && entry.message.includes('model down'))).toBe(true);
    });
});
