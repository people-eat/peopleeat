import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cities } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminCityDelete } from './adminCityDelete';

describe('adminCityDelete', () => {
    it('deletes the city and publishes adminUpdates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-delete-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cityId = idCreate();
        await testDb.insert(cities).values({
            cityId,
            pathName: `delete-city-${cityId.slice(0, 8)}`,
            nameDe: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });

        // Act
        const result = await adminCityDelete(
            adminMutationParent(admin.user.userId),
            { cityId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cityId });
        const rows = await testDb.select().from(cities).where(eq(cities.cityId, cityId));
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('throws when the city is missing, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'city-delete-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cityId = idCreate();

        // Act + Assert
        await expect(
            adminCityDelete(adminMutationParent(admin.user.userId), { cityId }, admin.requestingSession, admin.serverRuntime),
        ).rejects.toThrow(/city not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/city not found/);
    });
});
