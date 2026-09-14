import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { webPageDefaults } from '../../shared/webPage';
import { webPages } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicWebPageFindOne } from './publicWebPageFindOne';

describe('publicWebPageFindOne', () => {
    it('returns the stored web page when a row exists', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup.withUser();
        await testDb
            .insert(webPages)
            .values({ webPageKey: 'ABOUT_US', ...webPageDefaults.ABOUT_US, titleDe: 'Über uns stored' })
            .onConflictDoUpdate({
                target: webPages.webPageKey,
                set: { titleDe: 'Über uns stored' },
            });

        // Act
        const result = await publicWebPageFindOne({ webPageKey: 'ABOUT_US' }, serverRuntime);

        // Assert
        expect(result).toMatchObject({ webPageKey: 'ABOUT_US', titleDe: 'Über uns stored' });
    });

    it('returns defaults when the web page key has no row', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup.withUser();
        await testDb.delete(webPages).where(eq(webPages.webPageKey, 'PROFILE'));

        try {
            // Act
            const result = await publicWebPageFindOne({ webPageKey: 'PROFILE' }, serverRuntime);

            // Assert
            expect(result).toMatchObject({
                webPageKey: 'PROFILE',
                titleDe: webPageDefaults.PROFILE.titleDe,
                titleEn: webPageDefaults.PROFILE.titleEn,
                descriptionDe: webPageDefaults.PROFILE.descriptionDe,
                descriptionEn: webPageDefaults.PROFILE.descriptionEn,
            });
        } finally {
            await testDb
                .insert(webPages)
                .values({ webPageKey: 'PROFILE', ...webPageDefaults.PROFILE })
                .onConflictDoNothing();
        }
    });
});
