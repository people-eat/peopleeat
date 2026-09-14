import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cities } from '../db/schema';
import type { GqlSCityUpsert } from '../graphql/generated';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminCityUpsert } from './adminCityUpsert';

function cityInput(overrides: Partial<GqlSCityUpsert> = {}): GqlSCityUpsert {
    const suffix = idCreate().slice(0, 8).toLowerCase();
    return {
        pathName: `city-${suffix}`,
        nameDe: 'Berlin',
        nameEn: 'Berlin',
        latitude: 52.52,
        longitude: 13.405,
        titleDe: 'Titel',
        titleEn: 'Title',
        descriptionDe: 'Beschreibung',
        descriptionEn: 'Description',
        headlineDe: 'Headline DE',
        headlineEn: 'Headline EN',
        subHeadlineDe: 'Sub DE',
        subHeadlineEn: 'Sub EN',
        firstSectionHeadlineDe: '',
        firstSectionHeadlineEn: '',
        firstSectionBodyDe: '',
        firstSectionBodyEn: '',
        sections: [],
        ...overrides,
    };
}

describe('adminCityUpsert', () => {
    it('inserts a new city and publishes adminUpdates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-upsert-create', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const input = cityInput({
            pathName: `  Munich City ${idCreate().slice(0, 8)}  `,
            nameDe: '  München  ',
            titleDe: '  Titel  ',
            descriptionDe: '  Beschreibung  ',
            headlineDe: '  Headline  ',
            subHeadlineDe: '  Sub  ',
        });

        // Act
        const result = await adminCityUpsert(
            adminMutationParent(admin.user.userId),
            { input },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(cities).where(eq(cities.cityId, result.referenceId!));
        expect(row).toMatchObject({
            nameDe: 'München',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            previousPathNames: [],
        });
        expect(row?.pathName).toMatch(/^munich-city-/);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('updates an existing city and archives the previous pathName', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-upsert-update', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cityId = idCreate();
        const oldPath = `old-city-${cityId.slice(0, 8).toLowerCase()}`;
        const newPath = `new-city-${cityId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(cities).values({
            cityId,
            pathName: oldPath,
            previousPathNames: ['legacy-city'],
            nameDe: 'Alt',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Alt',
            descriptionDe: 'Alt',
            headlineDe: 'Alt',
            subHeadlineDe: 'Alt',
            sections: [],
        });

        // Act
        const result = await adminCityUpsert(
            adminMutationParent(admin.user.userId),
            { input: cityInput({ cityId, pathName: newPath, nameDe: 'Neu' }) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cityId });
        const [row] = await testDb.select().from(cities).where(eq(cities.cityId, cityId));
        expect(row?.pathName).toBe(newPath);
        expect(row?.nameDe).toBe('Neu');
        expect(row?.previousPathNames).toEqual(expect.arrayContaining(['legacy-city', oldPath]));
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects empty German fields without writing or publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-upsert-empty-de', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminCityUpsert(
                adminMutationParent(admin.user.userId),
                { input: cityInput({ nameDe: '   ' }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/required German fields must not be empty/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/required German fields must not be empty/);
    });

    it('rejects an empty pathName without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-upsert-empty-path', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminCityUpsert(
                adminMutationParent(admin.user.userId),
                { input: cityInput({ pathName: '   ' }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/pathName must not be empty/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
    });

    it('rejects an unknown cityId without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-upsert-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cityId = idCreate();

        // Act + Assert
        await expect(
            adminCityUpsert(
                adminMutationParent(admin.user.userId),
                { input: cityInput({ cityId }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/city not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/city not found/);
    });

    it('rejects invalid content sections without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-upsert-bad-sections', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminCityUpsert(
                adminMutationParent(admin.user.userId),
                {
                    input: cityInput({
                        sections: [{ sectionId: idCreate(), kind: 'image' }],
                    }),
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Invalid content sections/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/Invalid content sections/);
    });
});
