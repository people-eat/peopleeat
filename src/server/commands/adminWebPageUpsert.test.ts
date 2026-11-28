import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { webPageDefaults } from '../../shared/webPage';
import { admins, webPages } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminWebPageUpsert } from './adminWebPageUpsert';

describe('adminWebPageUpsert', () => {
    it('updates bilingual SEO fields for an existing row', async () => {
        const admin = await commandSetup.withUser({ firstName: 'web-page-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        await testDb
            .insert(webPages)
            .values({ webPageKey: 'ABOUT_US', ...webPageDefaults.ABOUT_US })
            .onConflictDoNothing();

        const result = await adminWebPageUpsert(
            adminMutationParent(admin.user.userId),
            {
                webPageKey: 'ABOUT_US',
                input: {
                    titleDe: 'Über peopleeat',
                    titleEn: 'About peopleeat',
                    titleNl: 'About peopleeat NL',
                    descriptionDe: 'Neue DE Beschreibung',
                    descriptionEn: 'New EN description',
                    descriptionNl: 'New NL description',
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBe('ABOUT_US');
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        const [row] = await testDb.select().from(webPages).where(eq(webPages.webPageKey, 'ABOUT_US'));
        expect(row?.titleDe).toBe('Über peopleeat');
        expect(row?.titleEn).toBe('About peopleeat');
        expect(row?.titleNl).toBe('About peopleeat NL');
        expect(row?.descriptionDe).toBe('Neue DE Beschreibung');
        expect(row?.descriptionEn).toBe('New EN description');
        expect(row?.descriptionNl).toBe('New NL description');
    });

    it('creates a row on first write when the key was missing', async () => {
        const admin = await commandSetup.withUser({ firstName: 'web-page-admin-create', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        await testDb.delete(webPages).where(eq(webPages.webPageKey, 'GIFT_CARD'));

        const result = await adminWebPageUpsert(
            adminMutationParent(admin.user.userId),
            {
                webPageKey: 'GIFT_CARD',
                input: {
                    titleDe: 'Geschenkkarte neu',
                    titleEn: 'Gift card new',
                    titleNl: 'Gift card NL',
                    descriptionDe: 'DE Beschreibung',
                    descriptionEn: 'EN description',
                    descriptionNl: 'NL description',
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBe('GIFT_CARD');
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        const [row] = await testDb.select().from(webPages).where(eq(webPages.webPageKey, 'GIFT_CARD'));
        expect(row).toMatchObject({
            titleDe: 'Geschenkkarte neu',
            titleEn: 'Gift card new',
            titleNl: 'Gift card NL',
            descriptionDe: 'DE Beschreibung',
            descriptionEn: 'EN description',
            descriptionNl: 'NL description',
        });
    });

    it('rejects empty German title', async () => {
        const admin = await commandSetup.withUser({ firstName: 'web-page-admin-2', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminWebPageUpsert(
                adminMutationParent(admin.user.userId),
                {
                    webPageKey: 'LANDING',
                    input: {
                        titleDe: '   ',
                        titleEn: '',
                        titleNl: '',
                        descriptionDe: 'Beschreibung',
                        descriptionEn: '',
                        descriptionNl: '',
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/titleDe and descriptionDe must not be empty/);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });
});
