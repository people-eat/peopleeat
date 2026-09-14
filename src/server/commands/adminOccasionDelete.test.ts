import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, occasions } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminOccasionDelete } from './adminOccasionDelete';

describe('adminOccasionDelete', () => {
    it('deletes the occasion and publishes adminUpdates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-delete-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const occasionId = idCreate();
        await testDb.insert(occasions).values({
            occasionId,
            pathName: `delete-occasion-${occasionId.slice(0, 8)}`,
            name: 'Geburtstag',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });

        // Act
        const result = await adminOccasionDelete(
            adminMutationParent(admin.user.userId),
            { occasionId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: occasionId });
        const rows = await testDb.select().from(occasions).where(eq(occasions.occasionId, occasionId));
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('throws when the occasion is missing, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-delete-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const occasionId = idCreate();

        // Act + Assert
        await expect(
            adminOccasionDelete(adminMutationParent(admin.user.userId), { occasionId }, admin.requestingSession, admin.serverRuntime),
        ).rejects.toThrow(/occasion not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/occasion not found/);
    });
});
