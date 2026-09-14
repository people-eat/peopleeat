import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { webPageDefaults, webPageKeys } from '../../shared/webPage';
import { webPages } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminWebPageFindMany } from './adminWebPageFindMany';
import { adminWebPageFindOne } from './adminWebPageFindOne';

describe('adminWebPageFindMany', () => {
    it('returns every catalog key in declaration order', async () => {
        const { serverRuntime } = await commandSetup();

        const rows = await adminWebPageFindMany(serverRuntime);

        expect(rows.map((row) => row.webPageKey)).toEqual([...webPageKeys]);
    });

    it('maps a persisted row and leaves other keys as ghosts', async () => {
        const { serverRuntime } = await commandSetup();
        await testDb
            .insert(webPages)
            .values({
                webPageKey: 'CHEFS',
                ...webPageDefaults.CHEFS,
                titleDe: 'Köche stored',
            })
            .onConflictDoUpdate({
                target: webPages.webPageKey,
                set: { titleDe: 'Köche stored' },
            });

        const rows = await adminWebPageFindMany(serverRuntime);
        const chefs = rows.find((row) => row.webPageKey === 'CHEFS');
        expect(chefs).toMatchObject({
            titleDe: 'Köche stored',
            persisted: true,
        });
        expect(chefs?.updatedAt).toBeInstanceOf(Date);
        expect(rows).toHaveLength(webPageKeys.length);
    });

    it('treats a missing row as a ghost filled from shared defaults', async () => {
        const { serverRuntime } = await commandSetup();
        await testDb.delete(webPages).where(eq(webPages.webPageKey, 'PROFILE'));

        try {
            const rows = await adminWebPageFindMany(serverRuntime);
            const ghost = rows.find((row) => row.webPageKey === 'PROFILE');
            expect(ghost).toMatchObject({
                ...webPageDefaults.PROFILE,
                persisted: false,
                updatedAt: null,
            });
        } finally {
            await testDb
                .insert(webPages)
                .values({ webPageKey: 'PROFILE', ...webPageDefaults.PROFILE })
                .onConflictDoNothing();
        }
    });
});

describe('adminWebPageFindOne', () => {
    it('returns the mapped web page row for a persisted key', async () => {
        const { serverRuntime } = await commandSetup();
        await testDb
            .insert(webPages)
            .values({ webPageKey: 'LANDING', ...webPageDefaults.LANDING, titleDe: 'Landing stored' })
            .onConflictDoUpdate({
                target: webPages.webPageKey,
                set: { titleDe: 'Landing stored' },
            });

        const row = await adminWebPageFindOne({ webPageKey: 'LANDING' }, serverRuntime);

        expect(row).toMatchObject({ webPageKey: 'LANDING', titleDe: 'Landing stored', persisted: true });
    });

    it('returns a ghost from shared defaults when the row is missing', async () => {
        const { serverRuntime } = await commandSetup();
        await testDb.delete(webPages).where(eq(webPages.webPageKey, 'CITIES'));

        try {
            const row = await adminWebPageFindOne({ webPageKey: 'CITIES' }, serverRuntime);

            expect(row).toMatchObject({
                webPageKey: 'CITIES',
                ...webPageDefaults.CITIES,
                persisted: false,
                updatedAt: null,
            });
        } finally {
            await testDb
                .insert(webPages)
                .values({ webPageKey: 'CITIES', ...webPageDefaults.CITIES })
                .onConflictDoNothing();
        }
    });
});
