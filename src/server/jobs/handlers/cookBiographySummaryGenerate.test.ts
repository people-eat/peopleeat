import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { cookBiographySummaryGenerate as cookBiographySummaryGenerateRun } from '../../commands/cookBiographySummaryGenerate';
import { cooks } from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { cookBiographySummaryGenerate } from './cookBiographySummaryGenerate';

vi.mock('../../commands/cookBiographySummaryGenerate', () => ({
    cookBiographySummaryGenerate: vi.fn(async () => 'Generated summary'),
}));

describe('cookBiographySummaryGenerate', () => {
    it('writes the summary and publishes userUpdates', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Bio' });
        await testDb.insert(cooks).values({
            cookId: user.userId,
            biography: '  Roland kocht in Mallorca und Hamburg.  ',
            cuisineStyle: 'Mediterran',
            cookingPhilosophy: 'Regional',
            biographySummary: 'old',
        });
        vi.mocked(cookBiographySummaryGenerateRun).mockResolvedValueOnce('Roland kocht zwischen Mallorca und Hamburg.');

        // Act
        await cookBiographySummaryGenerate.handler({
            data: { cookId: user.userId },
            serverRuntime,
        });

        // Assert
        expect(cookBiographySummaryGenerateRun).toHaveBeenCalledWith({
            cookId: user.userId,
            biography: 'Roland kocht in Mallorca und Hamburg.',
            cuisineStyle: 'Mediterran',
            cookingPhilosophy: 'Regional',
            requestingSession: null,
            serverRuntime,
        });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row?.biographySummary).toBe('Roland kocht zwischen Mallorca und Hamburg.');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('clears the summary and publishes when biography is empty', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Empty' });
        await testDb.insert(cooks).values({
            cookId: user.userId,
            biography: '   ',
            biographySummary: 'stale summary',
        });

        // Act
        await cookBiographySummaryGenerate.handler({
            data: { cookId: user.userId },
            serverRuntime,
        });

        // Assert
        expect(cookBiographySummaryGenerateRun).not.toHaveBeenCalled();
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row?.biographySummary).toBe('');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('no-ops when the cook is missing', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const missingCookId = idCreate();

        // Act
        await cookBiographySummaryGenerate.handler({
            data: { cookId: missingCookId },
            serverRuntime,
        });

        // Assert
        expect(cookBiographySummaryGenerateRun).not.toHaveBeenCalled();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('swallows command errors without rethrowing', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Fail' });
        await testDb.insert(cooks).values({
            cookId: user.userId,
            biography: 'A long enough biography for generation.',
            biographySummary: 'keep-me',
        });
        vi.mocked(cookBiographySummaryGenerateRun).mockRejectedValueOnce(new Error('llm failed'));
        const errorSpy = vi.spyOn(serverRuntime.log, 'error');

        // Act
        await expect(
            cookBiographySummaryGenerate.handler({
                data: { cookId: user.userId },
                serverRuntime,
            }),
        ).resolves.toBeUndefined();

        // Assert
        expect(errorSpy).toHaveBeenCalled();
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row?.biographySummary).toBe('keep-me');
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
