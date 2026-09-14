import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { featureToggleKeys } from '../../shared/featureToggle';
import { featureToggles } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminFeatureToggleFindMany } from './adminFeatureToggleFindMany';

describe('adminFeatureToggleFindMany', () => {
    it('returns every catalog key in declaration order', async () => {
        const { serverRuntime } = await commandSetup();

        const rows = await adminFeatureToggleFindMany(serverRuntime);

        expect(rows.map((row) => row.featureToggleKey)).toEqual([...featureToggleKeys]);
    });

    it('maps a persisted row and leaves other keys as ghosts or persisted independently', async () => {
        const { serverRuntime } = await commandSetup();
        await testDb.delete(featureToggles).where(eq(featureToggles.featureToggleKey, 'AI_MENU_EVALUATION'));
        await testDb.insert(featureToggles).values({
            featureToggleKey: 'AI_MENU_EVALUATION',
            enabled: true,
        });

        const rows = await adminFeatureToggleFindMany(serverRuntime);
        const ai = rows.find((row) => row.featureToggleKey === 'AI_MENU_EVALUATION');
        expect(ai).toMatchObject({ enabled: true, persisted: true });
        expect(ai?.updatedAt).toBeInstanceOf(Date);
        expect(rows).toHaveLength(featureToggleKeys.length);
    });

    it('treats a missing row as a disabled ghost', async () => {
        const { serverRuntime } = await commandSetup();
        await testDb.delete(featureToggles).where(eq(featureToggles.featureToggleKey, 'PUBLICATION_MENUS'));

        const rows = await adminFeatureToggleFindMany(serverRuntime);
        const ghost = rows.find((row) => row.featureToggleKey === 'PUBLICATION_MENUS');
        expect(ghost).toMatchObject({ enabled: false, persisted: false, updatedAt: null });
    });
});
