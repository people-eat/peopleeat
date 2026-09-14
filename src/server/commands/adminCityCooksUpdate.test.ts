import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cities, cityCooks, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminCityCooksUpdate } from './adminCityCooksUpdate';

describe('adminCityCooksUpdate', () => {
    it('replaces the ordered city cook assignment', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-cooks-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cityId = idCreate();
        await testDb.insert(cities).values({
            cityId,
            pathName: `cooks-city-${cityId.slice(0, 8)}`,
            nameDe: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        const cookA = await commandSetup.withUser({ firstName: 'Cook', lastName: 'A' });
        const cookB = await commandSetup.withUser({ firstName: 'Cook', lastName: 'B' });
        await testDb.insert(cooks).values({ cookId: cookA.user.userId });
        await testDb.insert(cooks).values({ cookId: cookB.user.userId });

        // Act
        const result = await adminCityCooksUpdate(
            adminMutationParent(admin.user.userId),
            { cityId, cookIds: [cookB.user.userId, cookA.user.userId] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cityId });
        const rows = await testDb.select().from(cityCooks).where(eq(cityCooks.cityId, cityId));
        expect(rows).toHaveLength(2);
        expect(rows.find((row) => row.cookId === cookB.user.userId)?.position).toBe(0);
        expect(rows.find((row) => row.cookId === cookA.user.userId)?.position).toBe(1);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('clears the assignment when cookIds is empty', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-cooks-clear', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cityId = idCreate();
        await testDb.insert(cities).values({
            cityId,
            pathName: `clear-city-${cityId.slice(0, 8)}`,
            nameDe: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Clear' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        await testDb.insert(cityCooks).values({ cityId, cookId: cook.user.userId, position: 0 });

        // Act
        const result = await adminCityCooksUpdate(
            adminMutationParent(admin.user.userId),
            { cityId, cookIds: [] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const rows = await testDb.select().from(cityCooks).where(eq(cityCooks.cityId, cityId));
        expect(rows).toHaveLength(0);
    });

    it('rejects unknown cook ids without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-cooks-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cityId = idCreate();
        await testDb.insert(cities).values({
            cityId,
            pathName: `missing-cook-city-${cityId.slice(0, 8)}`,
            nameDe: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });

        // Act + Assert
        await expect(
            adminCityCooksUpdate(
                adminMutationParent(admin.user.userId),
                { cityId, cookIds: [idCreate()] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/cook not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
    });
});
