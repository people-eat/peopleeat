import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cooks, occasionCooks, occasions } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminOccasionCooksUpdate } from './adminOccasionCooksUpdate';

describe('adminOccasionCooksUpdate', () => {
    it('replaces the ordered occasion cook assignment', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-cooks-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const occasionId = idCreate();
        await testDb.insert(occasions).values({
            occasionId,
            pathName: `occasion-${occasionId.slice(0, 8)}`,
            name: 'Geburtstag',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Occasion' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });

        // Act
        const result = await adminOccasionCooksUpdate(
            adminMutationParent(admin.user.userId),
            { occasionId, cookIds: [cook.user.userId] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: occasionId });
        const rows = await testDb.select().from(occasionCooks).where(eq(occasionCooks.occasionId, occasionId));
        expect(rows).toEqual([expect.objectContaining({ cookId: cook.user.userId, position: 0 })]);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown occasion without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-cooks-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminOccasionCooksUpdate(
                adminMutationParent(admin.user.userId),
                { occasionId: idCreate(), cookIds: [] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/occasion not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
    });
});
