import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cooks } from '../db/schema';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { cookBiographySuggest } from './cookBiographySuggest';
import { cookBiographySuggestGenerate } from './cookBiographySuggestGenerate';

vi.mock('../utils/featureToggleIsEnabled', () => ({
    featureToggleIsEnabled: vi.fn(async () => false),
}));

vi.mock('./cookBiographySuggestGenerate', () => ({
    cookBiographySuggestGenerate: vi.fn(async () => 'Suggested biography'),
}));

describe('cookBiographySuggest', () => {
    beforeEach(() => {
        vi.mocked(featureToggleIsEnabled).mockReset();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(false);
        vi.mocked(cookBiographySuggestGenerate).mockClear();
    });

    it('rejects when COOK_BIOGRAPHY_AI_WRITE is disabled', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            firstName: 'Chef',
            lastName: 'Bio',
        });
        await testDb.insert(cooks).values({ cookId: user.userId });

        await expect(
            cookBiographySuggest(cookMutationParent(user.userId), { currentBiography: '' }, requestingSession, serverRuntime),
        ).rejects.toThrow(/COOK_BIOGRAPHY_AI_WRITE is disabled/);

        expect(cookBiographySuggestGenerate).not.toHaveBeenCalled();
    });

    it('generates when COOK_BIOGRAPHY_AI_WRITE is enabled', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            firstName: 'Chef',
            lastName: 'Enabled',
        });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(true);

        const result = await cookBiographySuggest(
            cookMutationParent(user.userId),
            { currentBiography: 'Existing bio' },
            requestingSession,
            serverRuntime,
        );

        expect(result).toBe('Suggested biography');
        expect(cookBiographySuggestGenerate).toHaveBeenCalledOnce();
    });
});
